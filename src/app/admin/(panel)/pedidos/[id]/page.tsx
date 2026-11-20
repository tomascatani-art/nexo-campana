import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Store, Truck } from 'lucide-react';
import { getHours, getOrder, getSettings } from '@/lib/data';
import { DEFAULT_REPLIES, fillTemplate, statusMessage } from '@/lib/messages';
import { formatPrice, siteUrl, timeAgo, timeLeft } from '@/lib/format';
import { expireDueOrders, findNoShow } from '@/lib/orders';
import { PAYMENT_METHODS } from '@/lib/types';
import { OrderNote, PickupControls, STATUS_UI, StatusBadge, StatusControls } from '@/components/admin/OrderStatus';
import { WhatsAppIcon } from '@/components/icons';

export const metadata = { title: 'Pedido' };

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await expireDueOrders();
  const [o, s, hours] = await Promise.all([getOrder(id).catch(() => null), getSettings(), getHours()]);
  if (!o) notFound();
  const flagged = await findNoShow(o.customer_phone).catch(() => null);
  const deadline = o.expires_at ? new Date(o.expires_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  const phone = o.customer_phone.replace(/\D/g, '');
  const intl = phone.startsWith('54') ? phone : `549${phone.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1')}`;
  const msg = `Hola ${o.customer_name.split(' ')[0]}! Te escribimos de ${s.business_name} por tu pedido #${o.code}. `;
  const site = siteUrl(s);
  const wa = (t: string) => `https://wa.me/${intl}?text=${encodeURIComponent(t)}`;
  const replies = s.quick_replies ?? DEFAULT_REPLIES;
  const STATUS_LABEL: Record<string, string> = { pendiente: 'Recibimos tu pedido', confirmado: 'Pedido confirmado', preparando: 'Lo estamos preparando', enviado: o.delivery_method === 'envio' ? 'Salió el envío' : 'Listo para retirar', entregado: 'Gracias + pedir opinión', cancelado: 'Pedido cancelado', vencido: 'Venció (no lo retiró)' };
  return (
    <>
      <Link href="/admin/pedidos" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="size-4" /> Pedidos</Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Pedido #{o.code}</h1>
        <StatusBadge status={o.status} />
        <span className="text-gray-500">{new Date(o.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'medium', timeStyle: 'short' })}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {flagged && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="pickup-card">
              <h2 className="mb-3 font-bold">{o.delivery_method === 'retiro' ? 'Retiro en el local' : 'Atención'}</h2>
              <PickupControls id={o.id} status={o.delivery_method === 'retiro' ? o.status : 'entregado'} deadline={deadline} left={timeLeft(o.expires_at)} noShow={!!o.no_show}
                flaggedTimes={flagged?.times ?? 0} needsDeposit={!!o.needs_deposit} depositPct={s.noshow_deposit_pct ?? 20} phone={o.customer_phone} />
            </section>
          )}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold">Estado</h2>
            <StatusControls id={o.id} status={o.status} stockApplied={o.stock_applied} />
            <a href={wa(statusMessage(o, s, site))} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-[#25d366] bg-emerald-50 py-3 font-bold text-emerald-800 hover:bg-emerald-100"><WhatsAppIcon className="size-5" /> Avisarle al cliente: “{STATUS_LABEL[o.status]}”</a>
            <p className="mt-1.5 text-center text-xs text-gray-500">Se abre WhatsApp con el mensaje listo. Revisalo y tocá enviar.</p>
          </section>
          {!flagged && o.delivery_method === 'retiro' && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="pickup-card">
              <h2 className="mb-3 font-bold">{o.delivery_method === 'retiro' ? 'Retiro en el local' : 'Atención'}</h2>
              <PickupControls id={o.id} status={o.delivery_method === 'retiro' ? o.status : 'entregado'} deadline={deadline} left={timeLeft(o.expires_at)} noShow={!!o.no_show}
                flaggedTimes={0} needsDeposit={!!o.needs_deposit} depositPct={s.noshow_deposit_pct ?? 20} phone={o.customer_phone} />
            </section>
          )}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Respuestas rápidas</h2>
            <p className="mb-3 text-sm text-gray-500">Un toque y se abre WhatsApp con el mensaje para {o.customer_name.split(' ')[0]}. <Link href="/admin/respuestas" className="font-semibold underline">Editar respuestas</Link></p>
            <div className="flex flex-wrap gap-2">
              {replies.map((r) => <a key={r.title} href={wa(fillTemplate(r.text, s, hours, site, o.customer_name.split(' ')[0]))} target="_blank" rel="noopener noreferrer" className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:border-[#25d366] hover:bg-emerald-50">{r.title}</a>)}
            </div>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Productos</h2>
            <ul className="mt-3 divide-y divide-gray-100">
              {o.items.map((i, k) => (
                <li key={k} className="flex items-start justify-between gap-3 py-3">
                  <span><span className="font-bold">{i.qty} ×</span> <Link href={`/admin/productos/${i.product_id}`} className="hover:underline">{i.name}</Link>{i.variant && <span className="block text-sm text-gray-500">{i.variant}</span>}<span className="block text-sm text-gray-500">{formatPrice(i.unit_price)} c/u{i.bulk ? ' (precio x cantidad)' : ''}</span></span>
                  <span className="font-semibold tabular-nums">{formatPrice(i.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="tabular-nums">{formatPrice(o.subtotal)}</dd></div>
              {!!o.surcharge && <div className="flex justify-between text-amber-700"><dt>Recargo transferencia</dt><dd className="tabular-nums">+{formatPrice(o.surcharge)}</dd></div>}
              {!!o.discount && <div className="flex justify-between text-emerald-700"><dt>Descuento efectivo</dt><dd className="tabular-nums">-{formatPrice(o.discount)}</dd></div>}
              {o.delivery_method === 'envio' && <div className="flex justify-between"><dt className="text-gray-500">Envío</dt><dd className="tabular-nums">{o.shipping_cost == null ? 'A convenir' : o.shipping_cost === 0 ? 'Gratis' : formatPrice(o.shipping_cost)}</dd></div>}
              <div className="flex justify-between text-lg font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(o.total)}</dd></div>
              {!!o.usd_rate && <div className="flex justify-between font-bold text-emerald-700"><dt>En dólares (cotiz. {formatPrice(o.usd_rate)})</dt><dd className="tabular-nums">US$ {Math.ceil(o.total / o.usd_rate).toLocaleString('es-AR')}</dd></div>}
            </dl>
          </section>
        </div>
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Cliente</h2>
            <p className="mt-2 text-lg font-semibold">{o.customer_name}</p>
            <p className="mt-1 flex items-center gap-2 text-gray-700"><Phone className="size-4" /> {o.customer_phone}</p>
            <p className="mt-1 flex items-start gap-2 text-gray-700">{o.delivery_method === 'envio' ? <><Truck className="mt-1 size-4 shrink-0" /> Envío a {o.address}{o.shipping_zone ? ` (${o.shipping_zone})` : ''}</> : <><Store className="mt-1 size-4 shrink-0" /> Retira en el local</>}</p>
            {o.payment_method && <p className="mt-1 text-gray-700">💳 {PAYMENT_METHODS[o.payment_method] ?? o.payment_method}</p>}
            {o.customer_note && <p className="mt-3 rounded-xl bg-gray-50 p-3 text-gray-700">“{o.customer_note}”</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3 font-bold text-white"><WhatsAppIcon className="size-5" /> WhatsApp</a>
              <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-semibold"><Phone className="size-4" /> Llamar</a>
            </div>
            {o.delivery_method === 'envio' && o.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-semibold"><MapPin className="size-4" /> Ver dirección en el mapa</a>}
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold">Pago y notas</h2>
            <OrderNote id={o.id} note={o.admin_note} paid={o.payment_status === 'pagado'} />
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Historial</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {[...o.history].reverse().map((h, i) => <li key={i} className="flex justify-between gap-3"><span><b>{STATUS_UI[h.status]?.label ?? h.status}</b> <span className="text-gray-500">· {h.by}</span></span><span className="text-gray-400">{timeAgo(h.at)}</span></li>)}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
