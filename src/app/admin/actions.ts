'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type postgres from 'postgres';
import { sql } from '@/lib/db';
import { changePassword, login, logout, requireAdmin } from '@/lib/auth';
import { cleanupOrphanImages, storeImage } from '@/lib/images';
import { slugify } from '@/lib/format';
import { ACTIVE_STATUSES, applyOrderStatus, ensureHoldSchema, phoneKey } from '@/lib/orders';

export type FormState = { ok?: boolean; error?: string; message?: string; field?: string } | undefined;

/** Error con el nombre del campo a marcar en el formulario. */
class FieldError extends Error {
  constructor(message: string, public field: string) { super(message); }
}

const UUID = z.string().uuid();

/** Porcentaje 0–50 ("5", "7,5"). Vacío o 0 = null. */
function pct(v: FormDataEntryValue | null, label: string): number | null {
  const s = String(v ?? '').replace(',', '.').replace('%', '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 50) throw new Error(`${label} tiene que ser entre 0 y 50%.`);
  return n || null;
}

/** Convierte "45.000", "45000,50" o "$ 45.000" en número. Vacío = null. */
function parsePrice(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').replace(/[$\s]/g, '').trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 999_999_999) throw new Error(`El precio "${v}" no es válido.`);
  return Math.round(n * 100) / 100;
}

const text = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' ? v.trim() : v ?? ''), z.string().max(max, `Máximo ${max} caracteres`)).transform((v) => (v === '' ? null : v));
const required = (label: string, max: number) =>
  z.preprocess((v) => (typeof v === 'string' ? v.trim() : ''), z.string().min(1, `${label} es obligatorio`).max(max, `${label}: máximo ${max} caracteres`));
const bool = z.preprocess((v) => v === 'on' || v === 'true' || v === '1', z.boolean());
const optUuid = z.preprocess((v) => (v ? v : null), UUID.nullable());
const optInt = (label: string, min = 0, max = 1_000_000) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(String(v).replace(/\./g, ''))), z.number({ message: `${label}: número inválido` }).int(`${label}: usá números enteros`).min(min, `${label}: mínimo ${min}`).max(max).nullable());

function fail(e: unknown): FormState {
  if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e;
  if (e instanceof z.ZodError) {
    const first = e.issues[0]?.path?.[0];
    return { error: e.issues.map((i) => i.message).join(' · '), field: typeof first === 'string' ? first : undefined };
  }
  if (e instanceof FieldError) return { error: e.message, field: e.field };
  // Errores técnicos (base de datos, conexión): mensaje claro en vez del código
  if (e && typeof e === 'object' && ('code' in e || 'severity' in e || (e instanceof Error && /^[A-Z_]{6,}\b/.test(e.message)))) {
    console.error(e);
    return { error: 'No se pudo guardar por un problema de conexión. Esperá unos segundos y tocá Guardar de nuevo. Si sigue pasando, avisale a quien te hizo la web.' };
  }
  return { error: e instanceof Error ? e.message : 'Ocurrió un error. Intentá de nuevo.' };
}

function refreshSite() {
  revalidatePath('/', 'layout');
}

// ------------------------------------------------------------------ sesión
export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const username = String(fd.get('username') ?? '');
  const password = String(fd.get('password') ?? '');
  if (!username || !password) return { error: 'Completá usuario y contraseña.' };
  const r = await login(username, password);
  if (!r.ok) return { error: r.error };
  redirect('/admin');
}

export async function logoutAction() {
  await logout();
  redirect('/admin/login');
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const current = String(fd.get('current') ?? '');
  const next = String(fd.get('next') ?? '');
  if (next.length < 8) return { error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return { error: 'Usá letras y números en la nueva contraseña.' };
  if (next !== String(fd.get('confirm') ?? '')) return { error: 'Las contraseñas nuevas no coinciden.' };
  const r = await changePassword(user, current, next);
  if (!r.ok) return { error: r.error };
  return { ok: true, message: 'Contraseña actualizada. Se cerró la sesión en los demás dispositivos.' };
}

// ------------------------------------------------------------------ imágenes
export async function uploadImageAction(fd: FormData): Promise<{ id?: string; error?: string }> {
  await requireAdmin();
  try {
    const file = fd.get('file');
    if (!(file instanceof File)) return { error: 'No se recibió ninguna imagen.' };
    return { id: await storeImage(file) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo subir la imagen.' };
  }
}

// ------------------------------------------------------------------ productos
const productSchema = z.object({
  name: required('El nombre', 120),
  category_id: optUuid,
  description: text(1500),
  image_id: optUuid,
  unit_label: text(30),
  sku: text(40),
  bulk_qty: optInt('Cantidad para el precio por cantidad', 2, 100000),
  min_stock: optInt('Alerta de stock', 0, 100000),
  active: bool,
  featured: bool,
  is_new: bool,
  track_stock: bool,
  variant_label: text(30),
  share_hook: text(120),
  share_features: text(800),
  share_closing: text(160),
});

type VariantIn = { id: string | null; name: string; sku: string | null; price: number | null; stock_qty: number; active: boolean };
/** Lee las variantes del formulario (campos v_name[], v_price[], v_stock[], …). */
function parseVariants(fd: FormData): VariantIn[] {
  const names = fd.getAll('v_name').map(String);
  const ids = fd.getAll('v_id').map(String);
  const skus = fd.getAll('v_sku').map(String);
  const prices = fd.getAll('v_price');
  const stocks = fd.getAll('v_stock').map(String);
  const actives = fd.getAll('v_active').map(String);
  const out: VariantIn[] = [];
  names.forEach((n, i) => {
    const name = n.trim();
    if (!name) return;
    if (name.length > 60) throw new Error('El nombre de una variante es muy largo (máx. 60).');
    const st = stocks[i]?.trim() ? Number(stocks[i].replace(/\./g, '')) : 0;
    if (!Number.isInteger(st) || st < 0) throw new Error(`El stock de la variante "${name}" no es válido.`);
    const id = ids[i] || null;
    if (id) UUID.parse(id);
    out.push({ id, name, sku: skus[i]?.trim() || null, price: parsePrice(prices[i] ?? null), stock_qty: st, active: actives[i] !== '0' });
  });
  if (new Set(out.map((v) => v.name.toLowerCase())).size !== out.length) throw new Error('Hay dos variantes con el mismo nombre.');
  if (out.length > 40) throw new Error('Máximo 40 variantes por producto.');
  return out;
}

/** Guarda variantes y registra en el historial las diferencias de stock. */
async function syncVariants(tx: postgres.TransactionSql, productId: string, vs: VariantIn[], user: string) {
  const cur = await tx<{ id: string; stock_qty: number; name: string }[]>`select id, stock_qty, name from product_variants where product_id = ${productId}`;
  const keep = vs.filter((v) => v.id && cur.some((c) => c.id === v.id)).map((v) => v.id!);
  const removed = cur.filter((c) => !keep.includes(c.id));
  if (removed.length) await tx`delete from product_variants where id = any(${removed.map((r) => r.id)}::uuid[])`;
  let k = 0;
  for (const v of vs) {
    const before = cur.find((c) => c.id === v.id);
    const data = { name: v.name, sku: v.sku, price: v.price, stock_qty: v.stock_qty, active: v.active, sort_order: k++ * 10 };
    let vid = before?.id;
    if (before) await tx`update product_variants set ${tx(data)} where id = ${before.id}`;
    else [{ id: vid }] = await tx<{ id: string }[]>`insert into product_variants ${tx({ ...data, product_id: productId })} returning id`;
    const delta = v.stock_qty - (before?.stock_qty ?? 0);
    if (delta !== 0) await tx`insert into stock_movements ${tx({ product_id: productId, variant_id: vid!, kind: before ? 'ajuste' : 'entrada', qty: delta, note: before ? 'Corrección desde la ficha' : 'Stock inicial de la variante', created_by: user })}`;
  }
  await tx`update products set stock_qty = (select coalesce(sum(stock_qty), 0) from product_variants where product_id = ${productId}) where id = ${productId}`;
}

async function uniqueSlug(name: string, exceptId?: string) {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? base : `${base}-${i + 1}`;
    const [r] = await sql`select 1 from products where slug = ${s} ${exceptId ? sql`and id <> ${exceptId}` : sql``}`;
    if (!r) return s;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function saveProductAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  let id = String(fd.get('id') || '');
  let created = false;
  try {
    const base = productSchema.parse(Object.fromEntries(fd));
    const gallery = fd.getAll('gallery').map(String).filter(Boolean).slice(0, 6);
    gallery.forEach((g) => UUID.parse(g));
    const price = parsePrice(fd.get('price'));
    const old_price = parsePrice(fd.get('old_price'));
    const bulk_price = parsePrice(fd.get('bulk_price'));
    const cost = parsePrice(fd.get('cost'));
    if (old_price != null && price != null && old_price <= price) throw new FieldError('El "precio anterior" tiene que ser mayor al precio actual (es el que aparece tachado).', 'old_price');
    if ((base.bulk_qty == null) !== (bulk_price == null)) throw new FieldError('Para el precio por cantidad completá las dos cosas: desde cuántas unidades y a qué precio.', base.bulk_qty == null ? 'bulk_qty' : 'bulk_price');
    if (bulk_price != null && price != null && bulk_price >= price) throw new FieldError('El precio por cantidad tiene que ser menor al precio por unidad.', 'bulk_price');
    // Oferta programada (fechas en hora de Argentina)
    const offer_price = parsePrice(fd.get('offer_price'));
    const arDate = (k: string) => { const v = String(fd.get(k) ?? '').trim(); if (!v) return null; if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) throw new FieldError('Revisá las fechas de la oferta.', k); return new Date(`${v}:00-03:00`); };
    const offer_from = offer_price != null ? arDate('offer_from') : null;
    const offer_until = offer_price != null ? arDate('offer_until') : null;
    if (offer_price != null && price == null) throw new FieldError('Para programar una oferta el producto tiene que tener precio.', 'price');
    if (offer_price != null && price != null && offer_price >= price) throw new FieldError('El precio de oferta tiene que ser menor al precio normal.', 'offer_price');
    if (offer_price != null && !offer_until) throw new FieldError('Poné hasta cuándo dura la oferta.', 'offer_until');
    if (offer_from && offer_until && offer_until <= offer_from) throw new FieldError('La oferta tiene que terminar después de empezar.', 'offer_until');
    const stockRaw = String(fd.get('stock_qty') ?? '').trim();
    const stock = stockRaw === '' ? null : Number(stockRaw.replace(/\./g, ''));
    if (stock != null && (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000)) throw new FieldError('El stock tiene que ser un número entero (0 o más).', 'stock_qty');

    const variants = base.variant_label ? parseVariants(fd) : [];
    if (base.variant_label && variants.length === 0) throw new FieldError(`Agregá al menos una opción de "${base.variant_label}", o dejá ese campo vacío si el producto no tiene variantes.`, 'variant_label');
    const data = { ...base, variant_label: variants.length ? base.variant_label : null, min_stock: base.min_stock ?? 0, gallery, price, old_price, bulk_price, cost, offer_price, offer_from, offer_until };
    if (id) {
      UUID.parse(id);
      // El slug se calcula antes de abrir la transacción (no se mezclan conexiones)
      const [pre] = await sql<{ name: string }[]>`select name from products where id = ${id}`;
      const slug = pre && pre.name !== data.name ? await uniqueSlug(data.name, id) : undefined;
      await sql.begin(async (tx) => {
        const [cur] = await tx<{ stock_qty: number; name: string }[]>`select stock_qty, name from products where id = ${id} for update`;
        if (!cur) throw new Error('El producto ya no existe.');
        await tx`update products set ${tx({ ...data, ...(slug ? { slug } : {}) })}, updated_at = now() where id = ${id}`;
        if (variants.length) await syncVariants(tx, id, variants, user.username);
        else await tx`delete from product_variants where product_id = ${id}`;
        if (!variants.length && stock != null && stock !== cur.stock_qty) {
          await tx`update products set stock_qty = ${stock} where id = ${id}`;
          await tx`insert into stock_movements ${tx({ product_id: id, kind: 'ajuste', qty: stock - cur.stock_qty, note: 'Corrección desde la ficha del producto', created_by: user.username })}`;
        }
      });
    } else {
      const slug = await uniqueSlug(data.name);
      const [maxRow] = await sql<{ m: number }[]>`select coalesce(min(sort_order), 0) - 10 as m from products`;
      await sql.begin(async (tx) => {
        const [r] = await tx<{ id: string }[]>`insert into products ${tx({ ...data, slug, stock_qty: stock ?? 0, sort_order: maxRow.m })} returning id`;
        id = r.id;
        if (variants.length) await syncVariants(tx, id, variants, user.username);
        else if (stock) await tx`insert into stock_movements ${tx({ product_id: id, kind: 'entrada', qty: stock, note: 'Stock inicial', created_by: user.username })}`;
      });
      created = true;
    }
    refreshSite();
    await cleanupOrphanImages();
  } catch (e) {
    return fail(e);
  }
  if (created) redirect(`/admin/productos/${id}/compartir?nuevo=1`);
  redirect('/admin/productos?ok=' + encodeURIComponent('Producto guardado'));
}

export async function duplicateProductAction(id: string) {
  await requireAdmin();
  UUID.parse(id);
  const [p] = await sql<{ name: string }[]>`select name from products where id = ${id}`;
  if (!p) return;
  const slug = await uniqueSlug(p.name + ' copia');
  const [r] = await sql<{ id: string }[]>`
    insert into products (slug, name, category_id, description, image_id, gallery, price, old_price, unit_label, bulk_qty, bulk_price, cost, track_stock, stock_qty, min_stock, variant_label, is_new, active, featured, sort_order, share_hook, share_features, share_closing)
    select ${slug}, name || ' (copia)', category_id, description, image_id, gallery, price, old_price, unit_label, bulk_qty, bulk_price, cost, track_stock, 0, min_stock, variant_label, true, false, false, sort_order, share_hook, share_features, share_closing
    from products where id = ${id} returning id`;
  await sql`insert into product_variants (product_id, name, sku, price, stock_qty, active, sort_order)
    select ${r.id}, name, null, price, 0, active, sort_order from product_variants where product_id = ${id}`;
  redirect(`/admin/productos/${r.id}?ok=` + encodeURIComponent('Copia creada (oculta). Cambiá lo que necesites y activala.'));
}

// ------------------------------------------------------------------ categorías
export async function saveCategoryAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const data = z.object({ name: required('El nombre', 50), icon: z.preprocess((v) => v || 'package', z.string().max(40)), image_id: optUuid }).parse(Object.fromEntries(fd));
    const sp = String(fd.get('transfer_surcharge_pct') ?? '').replace(',', '.').trim();
    const transfer_surcharge_pct = sp === '' ? null : Number(sp);
    if (transfer_surcharge_pct != null && (!Number.isFinite(transfer_surcharge_pct) || transfer_surcharge_pct < 0 || transfer_surcharge_pct > 50)) throw new Error('El recargo tiene que ser entre 0 y 50%.');
    Object.assign(data, { transfer_surcharge_pct });
    const id = String(fd.get('id') || '');
    const slug = slugify(data.name);
    const [dup] = await sql`select 1 from categories where slug = ${slug} ${id ? sql`and id <> ${id}` : sql``}`;
    if (dup) throw new Error('Ya existe una categoría con ese nombre.');
    if (id) {
      UUID.parse(id);
      await sql`update categories set ${sql({ ...data, slug })} where id = ${id}`;
    } else {
      const [m] = await sql<{ m: number }[]>`select coalesce(max(sort_order), 0) + 10 as m from categories`;
      await sql`insert into categories ${sql({ ...data, slug, sort_order: m.m })}`;
    }
    refreshSite();
    await cleanupOrphanImages();
    return { ok: true, message: 'Categoría guardada' };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ acciones comunes
const TABLES = {
  products: { flags: ['active', 'featured', 'is_new', 'track_stock'], price: ['price', 'old_price', 'bulk_price', 'cost'] },
  categories: { flags: ['active'], price: [] as string[] },
} as const;
type Table = keyof typeof TABLES;
function checkTable(t: string): Table {
  if (!(t in TABLES)) throw new Error('Tabla no permitida');
  return t as Table;
}

export async function toggleFlagAction(table: string, id: string, field: string, value: boolean) {
  await requireAdmin();
  const t = checkTable(table);
  UUID.parse(id);
  if (!(TABLES[t].flags as readonly string[]).includes(field)) throw new Error('Campo no permitido');
  await sql`update ${sql(t)} set ${sql({ [field]: value })} where id = ${id}`;
  refreshSite();
  return { ok: true };
}

export async function updatePriceAction(table: string, id: string, field: string, raw: string): Promise<{ ok: boolean; error?: string; value?: number | null }> {
  await requireAdmin();
  try {
    const t = checkTable(table);
    UUID.parse(id);
    if (!(TABLES[t].price as readonly string[]).includes(field)) throw new Error('Campo no permitido');
    const value = parsePrice(raw);
    await sql`update ${sql(t)} set ${sql({ [field]: value })}, updated_at = now() where id = ${id}`;
    refreshSite();
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error' };
  }
}

export async function deleteItemAction(table: string, id: string) {
  await requireAdmin();
  const t = checkTable(table);
  UUID.parse(id);
  await sql`delete from ${sql(t)} where id = ${id}`;
  refreshSite();
  return { ok: true };
}

export async function moveItemAction(table: string, id: string, direction: 'up' | 'down') {
  await requireAdmin();
  const t = checkTable(table);
  UUID.parse(id);
  const rows = await sql<{ id: string }[]>`select id from ${sql(t)} order by sort_order, created_at desc`;
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await sql.begin(async (tx) => {
    for (let k = 0; k < rows.length; k++) await tx`update ${tx(t)} set sort_order = ${k * 10} where id = ${rows[k].id}`;
  });
  refreshSite();
  return { ok: true };
}

// ------------------------------------------------------------------ stock
export async function stockMovementAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  try {
    const rawId = String(fd.get('product_id') ?? '');
    if (!UUID.safeParse(rawId).success) throw new FieldError('Elegí un producto de la lista: escribí parte del nombre y tocalo en las opciones que aparecen abajo.', 'buscar_producto');
    const productId = rawId;
    const kind = z.enum(['entrada', 'venta', 'ajuste']).parse(fd.get('kind'));
    const variantId = fd.get('variant_id') ? UUID.parse(fd.get('variant_id')) : null;
    const qtyRaw = Number(String(fd.get('qty') ?? '').replace(/\./g, ''));
    if (!Number.isInteger(qtyRaw) || (qtyRaw === 0 && kind !== 'ajuste') || Math.abs(qtyRaw) > 100000) throw new FieldError('Escribí una cantidad válida (número entero).', 'qty');
    const note = text(200).parse(fd.get('note'));
    let unitPrice = parsePrice(fd.get('unit_price'));
    let msg = '';
    await sql.begin(async (tx) => {
      const [p] = await tx<{ stock_qty: number; price: number | null; name: string; variant_label: string | null }[]>`select stock_qty, price::float8 as price, name, variant_label from products where id = ${productId} for update`;
      if (!p) throw new Error('El producto ya no existe.');
      const [v] = variantId ? await tx<{ stock_qty: number; price: number | null; name: string }[]>`select stock_qty, price::float8 as price, name from product_variants where id = ${variantId} and product_id = ${productId} for update` : [];
      if (variantId && !v) throw new Error('La variante ya no existe.');
      if (!variantId && p.variant_label) {
        const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from product_variants where product_id = ${productId}`;
        if (n > 0) throw new Error(`Elegí la opción de ${p.variant_label.toLowerCase()}.`);
      }
      const current = v ? v.stock_qty : p.stock_qty;
      let delta: number;
      if (kind === 'entrada') delta = Math.abs(qtyRaw);
      else if (kind === 'venta') {
        delta = -Math.abs(qtyRaw);
        unitPrice ??= v?.price ?? p.price;
      } else delta = qtyRaw - current; // en "ajuste" se escribe el stock real contado
      if (kind === 'ajuste' && qtyRaw < 0) throw new Error('El stock contado no puede ser negativo.');
      if (delta === 0) throw new Error('El stock ya es ese número: no hay nada que corregir.');
      if (v) await tx`update product_variants set stock_qty = stock_qty + ${delta} where id = ${variantId}`;
      // si el producto no controlaba stock, al registrar un movimiento se activa
      await tx`update products set stock_qty = stock_qty + ${delta}, track_stock = true, updated_at = now() where id = ${productId}`;
      await tx`insert into stock_movements ${tx({ product_id: productId, variant_id: variantId, kind, qty: delta, unit_price: kind === 'venta' ? unitPrice : null, note, created_by: user.username })}`;
      msg = `${kind === 'entrada' ? 'Entrada' : kind === 'venta' ? 'Venta' : 'Ajuste'} registrada. Stock de "${p.name}${v ? ` (${v.name})` : ''}": ${current + delta}`;
    });
    refreshSite();
    return { ok: true, message: msg };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ aumento masivo de precios
export async function bulkPriceAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const pct = Number(String(fd.get('pct') ?? '').replace(',', '.'));
    if (!Number.isFinite(pct) || pct === 0 || pct < -90 || pct > 500) throw new Error('Escribí un porcentaje válido (por ejemplo 10 para subir 10%, o -5 para bajar 5%).');
    const cat = String(fd.get('category_id') || '');
    if (cat) UUID.parse(cat);
    const round = z.enum(['1', '10', '100', '500', '1000']).parse(String(fd.get('round') || '100'));
    const r = Number(round);
    const f = 1 + pct / 100;
    const rows = await sql`
      update products set
        price = case when price is null then null else greatest(round(price * ${f} / ${r}) * ${r}, ${r}) end,
        bulk_price = case when bulk_price is null then null else greatest(round(bulk_price * ${f} / ${r}) * ${r}, ${r}) end,
        old_price = case when old_price is null then null else greatest(round(old_price * ${f} / ${r}) * ${r}, ${r}) end,
        updated_at = now()
      where ${cat ? sql`category_id = ${cat}` : sql`true`} and price is not null
      returning id`;
    refreshSite();
    return { ok: true, message: `Listo: se ${pct > 0 ? 'aumentaron' : 'bajaron'} ${rows.length} precios un ${Math.abs(pct)}%.` };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ canal de WhatsApp
export async function markSharedAction(ids: string[]) {
  await requireAdmin();
  const list = z.array(UUID).max(50).parse(ids);
  if (list.length) await sql`update products set shared_at = now() where id = any(${list}::uuid[])`;
  return { ok: true };
}

// ------------------------------------------------------------------ pedidos
const STATUS = z.enum(['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado', 'vencido']);

async function holdHours() {
  await ensureHoldSchema();
  const [r] = await sql<{ h: number | null }[]>`select order_hold_hours as h from site_settings where id = 1`;
  return r?.h ?? 48;
}

/**
 * Cambia el estado de un pedido. Al pasar a "confirmado" (o cualquier estado posterior) se descuenta
 * el stock y se registra la venta. Si se cancela (o vence) un pedido que ya había descontado, el stock vuelve.
 */
export async function setOrderStatusAction(id: string, status: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const user = await requireAdmin();
  try {
    UUID.parse(id);
    const next = STATUS.parse(status);
    const hours = await holdHours();
    let warn = '';
    await sql.begin(async (tx) => { warn = (await applyOrderStatus(tx, id, next, user.username, { holdHours: hours })).warn; });
    refreshSite();
    revalidatePath('/admin', 'layout');
    const msgs: Record<string, string> = { confirmado: 'Pedido confirmado: el stock se descontó.', cancelado: 'Pedido cancelado.', vencido: 'Pedido marcado como vencido.', entregado: '¡Pedido entregado!' };
    return { ok: true, message: (msgs[next] ?? `Pedido marcado como ${next}.`) + warn };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error' };
  }
}

/** Le da más tiempo al cliente para retirar el pedido (si estaba vencido, lo vuelve a "Pendiente"). */
export async function extendOrderAction(id: string, hours: number): Promise<{ ok: boolean; message?: string; error?: string }> {
  const user = await requireAdmin();
  try {
    UUID.parse(id);
    const h = z.number().int().min(1).max(24 * 14).parse(hours);
    await ensureHoldSchema();
    await sql.begin(async (tx) => {
      const [o] = await tx<{ status: string }[]>`select status from orders where id = ${id} for update`;
      if (!o) throw new Error('El pedido ya no existe.');
      if (o.status === 'entregado' || o.status === 'cancelado') throw new Error('Este pedido ya está cerrado.');
      await tx`update orders set expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(hours => ${h}), updated_at = now() where id = ${id}`;
      if (o.status === 'vencido') await applyOrderStatus(tx, id, 'pendiente', user.username);
    });
    revalidatePath('/admin', 'layout');
    return { ok: true, message: `Listo: le diste ${h} horas más para retirarlo.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error' };
  }
}

/** "No lo retiró": vence el pedido (el stock vuelve) y suma al cliente a la lista de los que no retiran. */
export async function markNoShowAction(id: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  const user = await requireAdmin();
  try {
    UUID.parse(id);
    await ensureHoldSchema();
    await sql.begin(async (tx) => {
      const [o] = await tx<{ status: string; no_show: boolean; code: string; customer_name: string; customer_phone: string }[]>`
        select status, no_show, code, customer_name, customer_phone from orders where id = ${id} for update`;
      if (!o) throw new Error('El pedido ya no existe.');
      if (o.status === 'entregado') throw new Error('Este pedido figura como entregado.');
      if (ACTIVE_STATUSES.includes(o.status)) await applyOrderStatus(tx, id, 'vencido', user.username);
      if (o.no_show) return;
      await tx`update orders set no_show = true where id = ${id}`;
      await tx`insert into no_show_customers ${tx({ phone_key: phoneKey(o.customer_phone), name: o.customer_name, phone: o.customer_phone, last_order_code: o.code })}
        on conflict (phone_key) do update set times = no_show_customers.times + 1, name = excluded.name, phone = excluded.phone, last_order_code = excluded.last_order_code, updated_at = now()`;
    });
    refreshSite();
    revalidatePath('/admin', 'layout');
    return { ok: true, message: 'Listo: lo anotamos en “No retiraron”. La próxima vez que pida, le vamos a pedir seña.' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error' };
  }
}

/** Saca a un cliente de la lista "No retiraron" (ya no se le pide seña). */
export async function removeNoShowAction(phone: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  await requireAdmin();
  try {
    await ensureHoldSchema();
    const key = phoneKey(z.string().max(40).parse(phone));
    await sql`delete from no_show_customers where phone_key = ${key}`;
    revalidatePath('/admin', 'layout');
    return { ok: true, message: 'Listo: lo sacamos de la lista.' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error' };
  }
}

export async function saveOrderNoteAction(id: string, note: string, paid: boolean) {
  await requireAdmin();
  UUID.parse(id);
  await sql`update orders set admin_note = ${note.trim().slice(0, 500) || null}, payment_status = ${paid ? 'pagado' : 'pendiente'}, updated_at = now() where id = ${id}`;
  revalidatePath('/admin', 'layout');
  return { ok: true };
}

// ------------------------------------------------------------------ negocio
const url = (label: string) => z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.union([z.literal(''), z.string().url(`El enlace de ${label} no es válido (tiene que empezar con https://)`).max(300)])).transform((v) => v || null);
const settingsSchema = z.object({
  business_name: required('El nombre del negocio', 80),
  business_kind: required('El rubro', 40),
  slogan: text(120),
  tagline: text(120),
  hero_title: text(90),
  hero_subtitle: text(300),
  hero_image_id: optUuid,
  hero_welcome: text(40),
  transfer_notice: text(240),
  refund_policy: text(240),
  admission_notice: text(160),
  transfer_info_public: bool,
  greeting_template: text(1500),
  hero_video_on: bool,
  logo_image_id: optUuid,
  about_title: text(120),
  about_text: text(3000),
  about_image_id: optUuid,
  whatsapp_number: z.preprocess((v) => String(v ?? '').replace(/\D/g, ''), z.string().refine((s) => s === '' || (s.length >= 10 && s.length <= 15), 'El WhatsApp debe tener entre 10 y 15 números (ej: 5493489123456)')),
  channel_url: url('canal de WhatsApp').refine((v) => !v || /^https:\/\/(www\.)?whatsapp\.com\/channel\//.test(v), 'El enlace del canal tiene que ser del tipo https://whatsapp.com/channel/…'),
  phone: text(40),
  email: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.union([z.literal(''), z.string().email('El email no es válido').max(120)])).transform((v) => v || null),
  address: text(120),
  city: text(60),
  province: text(60),
  postal_code: text(12),
  maps_query: text(200),
  instagram_url: url('Instagram'),
  facebook_url: url('Facebook'),
  tiktok_url: url('TikTok'),
  price_note: text(300),
  list_note: text(300),
  share_footer: text(300),
  hide_out_of_stock: bool,
  show_stock_left: bool,
  announcement_text: text(160),
  announcement_on: bool,
  promos_enabled: bool,
  pickup_enabled: bool,
  shipping_enabled: bool,
  shipping_info: text(400),
  transfer_info: text(200),
  seo_title: text(90),
  seo_description: text(200),
});

export async function saveSettingsAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const section = String(fd.get('_section') || 'all');
    const parsed = settingsSchema.partial().parse(Object.fromEntries(fd));
    // Cada pestaña guarda solo sus campos (los interruptores sin tildar no se envían, por eso se listan).
    const SECTIONS: Record<string, string[]> = {
      general: ['business_name', 'business_kind', 'slogan', 'tagline', 'logo_image_id', 'announcement_text', 'announcement_on'],
      portada: ['hero_title', 'hero_subtitle', 'hero_image_id', 'hero_welcome', 'hero_video_on', 'about_title', 'about_text', 'about_image_id'],
      contacto: ['whatsapp_number', 'channel_url', 'phone', 'email', 'address', 'city', 'province', 'postal_code', 'maps_query', 'instagram_url', 'facebook_url', 'tiktok_url'],
      venta: ['pickup_enabled', 'transfer_info', 'transfer_info_public', 'transfer_notice', 'refund_policy', 'admission_notice', 'promos_enabled', 'hide_out_of_stock', 'show_stock_left', 'price_note', 'list_note', 'share_footer'],
      google: ['seo_title', 'seo_description'],
    };
    const keys = SECTIONS[section] ?? Object.values(SECTIONS).flat();
    const data: Record<string, unknown> = {};
    for (const k of keys) data[k] = (parsed as Record<string, unknown>)[k] ?? (k in settingsSchema.shape && settingsSchema.shape[k as keyof typeof settingsSchema.shape] === bool ? false : null);
    if (section === 'venta') {
      Object.assign(data, {
        min_order_total: parsePrice(fd.get('min_order_total')),
        cash_discount_pct: (() => { const v = String(fd.get('cash_discount_pct') ?? '').replace(',', '.').trim(); if (!v) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 50) throw new Error('El descuento por efectivo tiene que ser entre 0 y 50%.'); return n || null; })(),
        payment_methods: fd.getAll('payment_methods').map(String).filter((m) => ['efectivo', 'transferencia', 'debito', 'credito', 'mercadopago', 'dolares'].includes(m)),
        transfer_surcharge_pct: pct(fd.get('transfer_surcharge_pct'), 'El recargo por transferencia'),
      });
      if (fd.has('order_hold_hours')) {
        await ensureHoldSchema();
        const h = Number(fd.get('order_hold_hours'));
        if (![0, 24, 48, 72].includes(h)) throw new Error('Elegí cuántas horas se guarda un pedido.');
        data.order_hold_hours = h;
        data.noshow_deposit_pct = pct(fd.get('noshow_deposit_pct'), 'La seña') ?? 20;
      }
      const [cur] = await sql<{ shipping_mode: string }[]>`select shipping_mode from site_settings where id = 1`;
      if (!data.pickup_enabled && cur?.shipping_mode !== 'activo') throw new Error('Mientras los envíos no estén activos, el retiro en el local tiene que quedar activado.');
    }
    if (section === 'general' && !data.business_name) throw new Error('El nombre del negocio es obligatorio.');
    if (section === 'general' && !data.business_kind) data.business_kind = 'Mayorista y minorista';
    await sql`update site_settings set ${sql(data)}, updated_at = now() where id = 1`;
    refreshSite();
    await cleanupOrphanImages();
    return { ok: true, message: 'Cambios guardados. Ya se ven en la web.' };
  } catch (e) {
    return fail(e);
  }
}

export async function saveHoursAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    const rows = [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const g = (k: string) => {
        const v = String(fd.get(`${k}_${d}`) ?? '').trim();
        if (v && !time.test(v)) throw new Error('Hay un horario con formato inválido.');
        return v || null;
      };
      const r = { day_of_week: d, is_open: fd.get(`open_${d}`) === 'on', open1: g('open1'), close1: g('close1'), open2: g('open2'), close2: g('close2') };
      if (r.is_open) {
        if (!r.open1 || !r.close1) throw new Error('Cada día abierto necesita al menos un horario de apertura y cierre.');
        if (r.open1 >= r.close1) throw new Error('La hora de cierre debe ser posterior a la de apertura.');
        if ((r.open2 && !r.close2) || (!r.open2 && r.close2)) throw new Error('Completá apertura y cierre del segundo turno, o dejá ambos vacíos.');
        if (r.open2 && r.close2 && (r.open2 >= r.close2 || r.open2 < r.close1)) throw new Error('El segundo turno debe empezar después del primero.');
      }
      return r;
    });
    await sql.begin(async (tx) => {
      for (const r of rows) {
        await tx`insert into opening_hours ${tx(r)} on conflict (day_of_week) do update set
          is_open = excluded.is_open, open1 = excluded.open1, close1 = excluded.close1, open2 = excluded.open2, close2 = excluded.close2`;
      }
    });
    refreshSite();
    return { ok: true, message: 'Horarios actualizados.' };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ envíos
const MODES = ['off', 'proximamente', 'activo'] as const;

/** Cambia el modo de envíos con un toque. */
export async function setShippingModeAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const mode = z.enum(MODES).parse(fd.get('mode'));
    const [s] = await sql<{ shipping_zones: { name: string; cost: number | null }[]; shipping_cost: number | null }[]>`select shipping_zones, shipping_cost::float8 as shipping_cost from site_settings where id = 1`;
    await sql`update site_settings set shipping_mode = ${mode}, shipping_enabled = ${mode === 'activo'},
      pickup_enabled = case when ${mode} = 'activo' then pickup_enabled else true end, updated_at = now() where id = 1`;
    refreshSite();
    const warn = mode === 'activo' && !s.shipping_zones?.length && s.shipping_cost == null ? ' Ojo: no cargaste costo de envío, va a decir “a convenir”.' : '';
    return { ok: true, message: { off: 'Envíos desactivados: la web no los menciona.', proximamente: 'Listo: la web muestra “Envíos próximamente”.', activo: '¡Envíos activados! Ya se pueden pedir desde la web.' }[mode] + warn };
  } catch (e) {
    return fail(e);
  }
}

export async function saveShippingAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const names = fd.getAll('z_name').map((v) => String(v).trim());
    const costs = fd.getAll('z_cost');
    const zones = names.flatMap((name, i) => {
      if (!name) return [];
      if (name.length > 60) throw new Error('El nombre de una zona es muy largo (máx. 60).');
      return [{ name, cost: parsePrice(costs[i] ?? null) }];
    });
    if (new Set(zones.map((z) => z.name.toLowerCase())).size !== zones.length) throw new Error('Hay dos zonas con el mismo nombre.');
    if (zones.length > 30) throw new Error('Máximo 30 zonas.');
    const info = text(400).parse(fd.get('shipping_info'));
    const soon = text(120).parse(fd.get('shipping_soon_text'));
    await sql`update site_settings set ${sql({
      shipping_cost: parsePrice(fd.get('shipping_cost')), free_shipping_from: parsePrice(fd.get('free_shipping_from')),
      shipping_info: info, shipping_soon_text: soon, shipping_zones: sql.json(zones),
    })}, updated_at = now() where id = 1`;
    refreshSite();
    return { ok: true, message: 'Datos de envío guardados.' };
  } catch (e) {
    return fail(e);
  }
}

export async function waitlistAction(id: string, op: 'avisado' | 'borrar') {
  await requireAdmin();
  UUID.parse(id);
  if (op === 'avisado') await sql`update shipping_waitlist set notified_at = now() where id = ${id}`;
  else await sql`delete from shipping_waitlist where id = ${id}`;
  revalidatePath('/admin/envios');
  return { ok: true };
}

// ------------------------------------------------------------------ feriados y días especiales
export async function saveSpecialDayAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    const day = String(fd.get('day') ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) throw new Error('Elegí la fecha.');
    const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    if (day < today) throw new Error('Esa fecha ya pasó.');
    const isOpen = fd.get('kind') === 'abierto';
    const g = (k: string) => { const v = String(fd.get(k) ?? '').trim(); if (v && !time.test(v)) throw new Error('Hay un horario con formato inválido.'); return v || null; };
    const r = { open1: isOpen ? g('open1') : null, close1: isOpen ? g('close1') : null, open2: isOpen ? g('open2') : null, close2: isOpen ? g('close2') : null };
    if (isOpen && (!r.open1 || !r.close1 || r.open1 >= r.close1)) throw new Error('Completá el horario de ese día (apertura y cierre).');
    if (isOpen && ((r.open2 && !r.close2) || (!r.open2 && r.close2) || (r.open2 && r.close2 && (r.open2 >= r.close2 || r.open2 < r.close1!)))) throw new Error('Revisá el segundo turno.');
    const reason = (text(80).parse(fd.get('reason')) as string | null) ?? (isOpen ? 'Horario especial' : 'Feriado');
    await sql`insert into special_days ${sql({ day, is_open: isOpen, ...r, reason })}
      on conflict (day) do update set is_open = excluded.is_open, open1 = excluded.open1, close1 = excluded.close1, open2 = excluded.open2, close2 = excluded.close2, reason = excluded.reason`;
    refreshSite();
    return { ok: true, message: 'Día especial guardado. La web ya lo muestra.' };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSpecialDayAction(id: string) {
  await requireAdmin();
  UUID.parse(id);
  await sql`delete from special_days where id = ${id}`;
  refreshSite();
  return { ok: true };
}

/** Agrega de una vez varios feriados sugeridos (cerrado todo el día). */
export async function addHolidaysAction(days: { day: string; reason: string }[]) {
  await requireAdmin();
  const rows = days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day) && d.reason.length <= 80).slice(0, 30)
    .map((d) => ({ day: d.day, is_open: false, reason: d.reason }));
  if (rows.length) await sql`insert into special_days ${sql(rows)} on conflict (day) do nothing`;
  refreshSite();
  return { ok: true };
}

// ------------------------------------------------------------------ respuestas rápidas
export async function saveRepliesAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const titles = fd.getAll('r_title').map((v) => String(v).trim());
    const texts = fd.getAll('r_text').map((v) => String(v).trim());
    const rows = titles.flatMap((title, i) => (title && texts[i] ? [{ title: title.slice(0, 40), text: texts[i].slice(0, 600) }] : []));
    if (rows.length > 30) throw new Error('Máximo 30 respuestas.');
    await sql`update site_settings set quick_replies = ${sql.json(rows)}, updated_at = now() where id = 1`;
    revalidatePath('/admin', 'layout');
    return { ok: true, message: 'Respuestas guardadas.' };
  } catch (e) {
    return fail(e);
  }
}

// ------------------------------------------------------------------ opiniones
export async function reviewAction(id: string, op: 'publicada' | 'oculta' | 'borrar') {
  await requireAdmin();
  UUID.parse(id);
  if (op === 'borrar') await sql`delete from reviews where id = ${id}`;
  else if (op === 'publicada' || op === 'oculta') await sql`update reviews set status = ${op} where id = ${id}`;
  refreshSite();
  revalidatePath('/admin/opiniones');
  return { ok: true };
}

// ------------------------------------------------------------------ carga masiva (Excel / CSV)
const importRow = z.object({
  sku: z.string().trim().max(60).nullable(),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(60).nullable(),
  price: z.number().min(0).max(1e10).nullable(),
  old_price: z.number().min(0).max(1e10).nullable(),
  cost: z.number().min(0).max(1e10).nullable(),
  stock: z.number().int().min(0).max(1_000_000).nullable(),
  description: z.string().trim().max(1500).nullable(),
});
export type ImportRow = z.infer<typeof importRow>;

/**
 * Crea o actualiza productos desde una planilla. Busca por código (SKU) y si no, por nombre.
 * Solo cambia las columnas que vienen con dato; los productos nuevos quedan ocultos si así se pide.
 */
export async function importProductsAction(raw: unknown, publishNew: boolean): Promise<{ ok: true; created: number; updated: number } | { ok: false; error: string }> {
  const user = await requireAdmin();
  const parsed = z.array(importRow).min(1, 'La planilla está vacía.').max(2000, 'Máximo 2000 filas por vez.').safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Revisá la planilla.' };
  let created = 0, updated = 0;
  try {
    await sql.begin(async (tx) => {
      const cats = await tx<{ id: string; name: string }[]>`select id, name from categories`;
      const catId = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
      const existing = await tx<{ id: string; sku: string | null; name: string; stock_qty: number; has_variants: boolean }[]>`
        select id, sku, name, stock_qty, exists (select 1 from product_variants v where v.product_id = p.id) as has_variants from products p`;
      const bySku = new Map(existing.filter((e) => e.sku).map((e) => [e.sku!.toLowerCase(), e]));
      const byName = new Map(existing.map((e) => [e.name.toLowerCase(), e]));
      for (const r of parsed.data) {
        let category_id: string | undefined;
        if (r.category) {
          category_id = catId.get(r.category.toLowerCase());
          if (!category_id) {
            const [c] = await tx<{ id: string }[]>`insert into categories ${tx({ name: r.category, slug: `${slugify(r.category)}-${Math.random().toString(36).slice(2, 6)}`, sort_order: 999 })} returning id`;
            category_id = c.id;
            catId.set(r.category.toLowerCase(), c!.id);
          }
        }
        const found = (r.sku && bySku.get(r.sku.toLowerCase())) || byName.get(r.name.toLowerCase());
        const set: Record<string, unknown> = {};
        if (r.price != null) set.price = r.price;
        if (r.old_price != null) set.old_price = r.price != null && r.old_price > r.price ? r.old_price : null;
        if (r.cost != null) set.cost = r.cost;
        if (r.description) set.description = r.description;
        if (category_id) set.category_id = category_id;
        if (r.sku) set.sku = r.sku;
        if (found) {
          if (Object.keys(set).length) await tx`update products set ${tx(set)}, updated_at = now() where id = ${found.id}`;
          if (r.stock != null && !found.has_variants && r.stock !== found.stock_qty) {
            await tx`update products set stock_qty = ${r.stock} where id = ${found.id}`;
            await tx`insert into stock_movements ${tx({ product_id: found.id, kind: 'ajuste', qty: r.stock - found.stock_qty, note: 'Carga desde planilla', created_by: user.username })}`;
          }
          updated++;
        } else {
          let slug = slugify(r.name) || 'producto';
          if (existing.some((e) => slugify(e.name) === slug) || (await tx`select 1 from products where slug = ${slug}`).length) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
          const [p] = await tx<{ id: string }[]>`insert into products ${tx({ ...set, name: r.name, slug, stock_qty: r.stock ?? 0, active: publishNew, is_new: true })} returning id`;
          if (r.stock) await tx`insert into stock_movements ${tx({ product_id: p.id, kind: 'entrada', qty: r.stock, note: 'Carga desde planilla', created_by: user.username })}`;
          const e = { id: p.id, sku: r.sku, name: r.name, stock_qty: r.stock ?? 0, has_variants: false };
          byName.set(r.name.toLowerCase(), e);
          if (r.sku) bySku.set(r.sku.toLowerCase(), e);
          created++;
        }
      }
    });
    refreshSite();
    revalidatePath('/admin', 'layout');
    return { ok: true, created, updated };
  } catch (e) {
    return { ok: false, error: fail(e)?.error ?? 'No se pudo importar.' };
  }
}

// ------------------------------------------------------------------ video de portada (se sube en partes de 3 MB)
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const VIDEO_MAX = 40 * 1024 * 1024;

export async function startVideoUploadAction(mime: string, size: number): Promise<{ id?: string; error?: string }> {
  await requireAdmin();
  if (!VIDEO_TYPES.includes(mime)) return { error: 'Subí un video MP4, MOV o WebM.' };
  if (!Number.isInteger(size) || size <= 0 || size > VIDEO_MAX) return { error: 'El video puede pesar hasta 40 MB. Probá con uno más corto (10 a 20 segundos alcanza).' };
  await sql`delete from media where not complete and created_at < now() - interval '1 hour'`;
  const [r] = await sql<{ id: string }[]>`insert into media ${sql({ mime, size_bytes: size })} returning id`;
  return { id: r.id };
}

export async function appendVideoChunkAction(fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const id = UUID.parse(String(fd.get('id')));
  const chunk = fd.get('chunk');
  if (!(chunk instanceof File) || chunk.size === 0 || chunk.size > 3.5 * 1024 * 1024) return { error: 'Parte del video inválida.' };
  const buf = Buffer.from(await chunk.arrayBuffer());
  const [r] = await sql<{ n: number }[]>`update media set data = data || ${buf} where id = ${id} and not complete and octet_length(data) + ${buf.length} <= size_bytes returning octet_length(data)::int as n`;
  return r ? { ok: true } : { error: 'No se pudo guardar una parte del video. Probá de nuevo.' };
}

/** Termina la subida y lo pone en la portada (con su imagen de portada sacada del primer cuadro). */
export async function finishVideoUploadAction(id: string, posterId: string | null): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  UUID.parse(id);
  if (posterId) UUID.parse(posterId);
  const [r] = await sql`update media set complete = true where id = ${id} and octet_length(data) = size_bytes returning id`;
  if (!r) return { error: 'El video no llegó completo. Probá de nuevo.' };
  await sql`update site_settings set hero_video_id = ${id}, hero_poster_id = ${posterId}, hero_video_on = true, updated_at = now() where id = 1`;
  await sql`delete from media where id <> ${id}`; // solo se guarda el video en uso
  refreshSite();
  return { ok: true };
}

export async function resetHeroVideoAction(): Promise<{ ok: boolean }> {
  await requireAdmin();
  await sql`update site_settings set hero_video_id = null, hero_poster_id = null, updated_at = now() where id = 1`;
  await sql`delete from media`;
  refreshSite();
  return { ok: true };
}

// ------------------------------------------------------------------ cotización del dólar (se cambia todos los días)
export async function setUsdRateAction(raw: string): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  try {
    const rate = parsePrice(raw);
    if (rate != null && (rate < 1 || rate > 1_000_000)) throw new Error('Revisá la cotización.');
    await sql`update site_settings set usd_rate = ${rate}, usd_rate_at = ${rate == null ? null : sql`now()`}, updated_at = now() where id = 1`;
    refreshSite();
    return { ok: true };
  } catch (e) {
    return { error: fail(e)?.error };
  }
}

export async function saveGreetingAction(tpl: string): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();
  const t = tpl.trim().slice(0, 1500);
  await sql`update site_settings set greeting_template = ${t || null}, updated_at = now() where id = 1`;
  revalidatePath('/admin/canal');
  return { ok: true };
}
