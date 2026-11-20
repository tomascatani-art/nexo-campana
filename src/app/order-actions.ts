'use server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { formatPrice, offerActive, paymentAdjust, shippingFor, toUsd, unitPriceFor } from '@/lib/pricing';
import { PAYMENT_METHODS } from '@/lib/types';

const input = z.object({
  items: z.array(z.object({ id: z.string().uuid(), v: z.string().uuid().optional(), qty: z.number().int().min(1).max(10000) })).min(1).max(80),
  name: z.string().trim().min(2, 'Escribí tu nombre y apellido').max(80),
  phone: z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 8, 'Escribí un teléfono válido (con código de área)'),
  delivery: z.enum(['retiro', 'envio']),
  address: z.string().trim().max(200).optional(),
  zone: z.string().trim().max(60).optional(),
  payment: z.string().max(30).optional(),
  note: z.string().trim().max(400).optional(),
});

export type OrderResult = { ok: true; code: string; message: string; total: number } | { ok: false; error: string; field?: string };

/**
 * Registra el pedido (para que el negocio lo vea en el panel) con precios recalculados
 * desde la base, y arma el mensaje de WhatsApp. El cliente lo envía él mismo.
 * El pago se coordina con el negocio (preparado para sumar Mercado Pago más adelante).
 */
export async function submitOrderAction(raw: unknown): Promise<OrderResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i?.message ?? 'Revisá los datos.', field: String(i?.path[0] ?? '') };
  }
  const d = parsed.data;
  const s = await getSettings();
  if (d.delivery === 'envio' && !s.shipping_enabled) return { ok: false, error: 'Por ahora no hacemos envíos: elegí retiro en el local.', field: 'delivery' };
  if (d.delivery === 'retiro' && !s.pickup_enabled) return { ok: false, error: 'Elegí envío a domicilio.', field: 'delivery' };
  const zone = d.delivery === 'envio' && s.shipping_zones.length ? s.shipping_zones.find((z) => z.name === d.zone) : null;
  if (d.delivery === 'envio' && s.shipping_zones.length && !zone) return { ok: false, error: 'Elegí tu zona de envío.', field: 'zone' };
  if (d.delivery === 'envio' && (!d.address || d.address.length < 5)) return { ok: false, error: 'Escribí la dirección de entrega.', field: 'address' };
  const payment = d.payment && s.payment_methods.includes(d.payment) ? d.payment : null;

  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
  try {
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from orders where ip = ${ip} and created_at > now() - interval '1 hour'`;
    if (n >= 12) return { ok: false, error: 'Hiciste muchos pedidos seguidos. Probá de nuevo en un rato o escribinos por WhatsApp.' };

    const ids = [...new Set(d.items.map((i) => i.id))];
    const rows = await sql<{ id: string; name: string; price: number | null; bulk_qty: number | null; bulk_price: number | null; unit_label: string | null; track_stock: boolean; stock_qty: number; variant_label: string | null; offer_price: number | null; offer_from: string | null; offer_until: string | null; cat: string | null }[]>`
      select id, name, (select slug from categories c where c.id = products.category_id) as cat, price::float8 as price, offer_price::float8 as offer_price, offer_from, offer_until, bulk_qty, bulk_price::float8 as bulk_price, unit_label, track_stock, stock_qty, variant_label
      from products where id = any(${ids}::uuid[]) and active`;
    const vids = d.items.flatMap((i) => (i.v ? [i.v] : []));
    const vrows = vids.length ? await sql<{ id: string; product_id: string; name: string; price: number | null; stock_qty: number }[]>`
      select id, product_id, name, price::float8 as price, stock_qty from product_variants where id = any(${vids}::uuid[]) and active` : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const vById = new Map(vrows.map((r) => [r.id, r]));
    const s_ = s.promos_enabled;
    const problems: string[] = [];
    const lines = d.items.flatMap((it) => {
      const p0 = byId.get(it.id);
      if (!p0) return [];
      // Oferta programada vigente: reemplaza el precio (igual que en la web)
      const p = s_ && offerActive(p0) && p0.price != null && p0.offer_price! < p0.price ? { ...p0, price: p0.offer_price } : p0;
      const v = it.v ? vById.get(it.v) : null;
      if (it.v && (!v || v.product_id !== p.id)) return [];
      const available = p.track_stock ? (v ? v.stock_qty : p.stock_qty) : Infinity;
      if (available <= 0) { problems.push(`${p.name}${v ? ` (${v.name})` : ''} se quedó sin stock`); return []; }
      const qty = Math.min(it.qty, available);
      if (qty < it.qty) problems.push(`De ${p.name} quedan ${available}`);
      const unit = unitPriceFor(s_ ? p : { ...p, bulk_qty: null, bulk_price: null }, qty, v?.price);
      return [{ product_id: p.id, variant_id: v?.id ?? null, name: p.name, variant: v ? `${p.variant_label ?? 'Opción'}: ${v.name}` : null, qty, unit_price: unit ?? 0, subtotal: (unit ?? 0) * qty, bulk: unit != null && p.price != null && unit < p.price && !v?.price, priced: unit != null, unit_label: p.unit_label, cat: p.cat }];
    });
    if (!lines.length) return { ok: false, error: problems.length ? `${problems.join('. ')}. Actualizá tu carrito.` : 'Los productos de tu carrito ya no están disponibles.' };
    if (problems.length) return { ok: false, error: `${problems.join('. ')}. Ajustamos tu carrito: revisalo y volvé a enviar.` };
    const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
    if (s.min_order_total && subtotal < s.min_order_total) return { ok: false, error: `La compra mínima es de ${formatPrice(s.min_order_total)}.` };
    const shipping = d.delivery === 'envio' ? shippingFor(s, subtotal, zone?.name) : null;
    const cats = await sql<{ slug: string; pct: number }[]>`select slug, transfer_surcharge_pct::float8 as pct from categories where transfer_surcharge_pct is not null`;
    const { discount, surcharge } = paymentAdjust(lines, payment, { cashPct: s.cash_discount_pct, transferPct: s.transfer_surcharge_pct, catPct: Object.fromEntries(cats.map((c) => [c.slug, c.pct])) });
    const total = subtotal - discount + surcharge + (shipping ?? 0);
    const usd = payment === 'dolares' ? toUsd(total, s.usd_rate) : null;

    let code = '';
    await sql.begin(async (tx) => {
      const [{ next }] = await tx<{ next: number }[]>`select coalesce(max(code::int), 1000) + 1 as next from orders where code ~ '^[0-9]+$'`;
      code = String(next);
      await tx`insert into orders ${tx({
        code, customer_name: d.name, customer_phone: d.phone, customer_note: d.note || null, delivery_method: d.delivery,
        address: d.delivery === 'envio' ? d.address : null, shipping_zone: zone?.name ?? null, payment_method: payment,
        items: tx.json(lines.map(({ priced: _p, unit_label: _u, cat: _c, ...l }) => l)), subtotal, shipping_cost: shipping, discount: discount || null, surcharge: surcharge || null, usd_rate: usd ? s.usd_rate : null, total, ip,
        history: tx.json([{ status: 'pendiente', at: new Date().toISOString(), by: 'cliente' }]),
      })}`;
    });
    revalidatePath('/admin', 'layout');

    const msg = [
      `Hola ${s.business_name}! 👋 Quiero hacer este pedido:`,
      `*Pedido #${code}*`,
      '',
      ...lines.map((l) => `• ${l.qty} x ${l.name}${l.variant ? ` (${l.variant})` : ''}${l.unit_label ? ` [${l.unit_label}]` : ''} — ${l.priced ? `${formatPrice(l.unit_price)} c/u${l.bulk ? ' (x cantidad)' : ''} = *${formatPrice(l.subtotal)}*` : 'precio a consultar'}`),
      '',
      `Subtotal: ${formatPrice(subtotal)}`,
      discount ? `Descuento pagando en efectivo (${s.cash_discount_pct}%): -${formatPrice(discount)}` : '',
      surcharge ? `Recargo por transferencia: +${formatPrice(surcharge)}` : '',
      d.delivery === 'envio' ? `Envío${zone ? ` (${zone.name})` : ''}: ${shipping == null ? 'a convenir' : shipping === 0 ? 'GRATIS' : formatPrice(shipping)}` : '',
      `*TOTAL: ${formatPrice(total)}*${lines.some((l) => !l.priced) ? ' + productos a consultar' : ''}`,
      payment === 'dolares' ? '💵 Pago en dólares: cotización del día (se confirma en el local)' : '',
      '',
      `👤 ${d.name}`,
      `📞 ${d.phone}`,
      d.delivery === 'envio' ? `🚚 Envío a domicilio${zone ? ` · ${zone.name}` : ''}\n📍 ${d.address}` : '🏬 Retiro en el local',
      payment ? `💳 Pago: ${PAYMENT_METHODS[payment] ?? payment}` : '',
      d.note ? `📝 ${d.note}` : '',
    ].filter((l, i, a) => !(l === '' && (a[i - 1] === '' || i === a.length - 1))).join('\n').trim();
    return { ok: true, code, message: msg, total };
  } catch (e) {
    console.error('submitOrderAction', e);
    return { ok: false, error: 'No pudimos registrar el pedido. Probá de nuevo o escribinos por WhatsApp.' };
  }
}

const waitInput = z.object({
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).refine((v) => { const n = v.replace(/\D/g, '').length; return n >= 8 && n <= 15; }, 'Escribí tu WhatsApp con código de área'),
});

/** "Avisame cuando haya envíos": guarda el WhatsApp del interesado para que el negocio le avise. */
export async function joinShippingWaitlistAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = waitInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Revisá los datos.' };
  const s = await getSettings();
  if (s.shipping_mode !== 'proximamente') return { ok: false, error: 'Esta lista ya no está disponible.' };
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
  try {
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from shipping_waitlist where ip = ${ip} and created_at > now() - interval '1 hour'`;
    if (n >= 5) return { ok: false, error: 'Ya recibimos tus datos. ¡Gracias!' };
    const digits = parsed.data.phone.replace(/\D/g, '');
    await sql`insert into shipping_waitlist ${sql({ name: parsed.data.name || null, phone: parsed.data.phone, phone_digits: digits, ip })}
      on conflict (phone_digits) do update set name = coalesce(excluded.name, shipping_waitlist.name), notified_at = null`;
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) {
    console.error('joinShippingWaitlistAction', e);
    return { ok: false, error: 'No pudimos guardar tus datos. Probá de nuevo.' };
  }
}

/** Cuenta visitas y "agregar al carrito" por producto (sin datos personales). */
export async function trackProductAction(id: string, kind: 'view' | 'add') {
  if (!/^[0-9a-f-]{36}$/i.test(id) || (kind !== 'view' && kind !== 'add')) return;
  try {
    const col = sql(kind === 'view' ? 'views' : 'adds');
    await sql`insert into product_stats (product_id, day, ${col})
      select ${id}, (now() at time zone 'America/Argentina/Buenos_Aires')::date, 1 where exists (select 1 from products where id = ${id} and active)
      on conflict (product_id, day) do update set ${col} = product_stats.${col} + 1`;
  } catch { /* las estadísticas nunca deben romper la tienda */ }
}

const reviewInput = z.object({
  name: z.string().trim().min(2, 'Escribí tu nombre').max(60),
  rating: z.number().int().min(1, 'Elegí de 1 a 5 estrellas').max(5),
  text: z.string().trim().min(5, 'Contanos un poco más').max(600),
  website: z.string().max(0).optional(), // trampa para robots: tiene que llegar vacío
});

/** Opinión de un cliente: queda "pendiente" hasta que el dueño la aprueba en el panel. */
export async function submitReviewAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Revisá los datos.' };
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
  try {
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from reviews where ip = ${ip} and created_at > now() - interval '1 day'`;
    if (n >= 3) return { ok: false, error: 'Ya recibimos tu opinión. ¡Gracias!' };
    const { name, rating, text } = parsed.data;
    await sql`insert into reviews ${sql({ name, rating, text, ip })}`;
    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (e) {
    console.error('submitReviewAction', e);
    return { ok: false, error: 'No pudimos guardar tu opinión. Probá de nuevo.' };
  }
}
