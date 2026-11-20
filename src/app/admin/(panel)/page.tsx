import Link from 'next/link';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, ClipboardList, Package, PackageX, Plus, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { getDashboard, getSettings } from '@/lib/data';
import { formatPrice, safeIso, timeAgo } from '@/lib/format';
import { WhatsAppIcon } from '@/components/icons';
import { SummaryButton } from '@/components/admin/SummaryButton';
import { UsdRate } from '@/components/admin/UsdRate';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const metadata = { title: 'Tablero' };

export default async function Dashboard() {
  const user = await requireAdmin();
  const [d, s] = await Promise.all([getDashboard(), getSettings()]);
  const trend = d.sales.total_prev30 > 0 ? Math.round(((d.sales.total30 - d.sales.total_prev30) / d.sales.total_prev30) * 100) : null;
  const max = Math.max(1, ...d.daily.map((x) => x.total));
  const [{ waiting }] = await sql<{ waiting: number }[]>`select count(*) filter (where notified_at is null)::int as waiting from shipping_waitlist`;
  const today = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long' });
  const summary = [
    `📊 *Resumen ${s.business_name}* · ${today}`,
    '',
    `💰 Ventas de hoy: *${formatPrice(d.sales.today) ?? '$ 0'}* (${d.sales.units_today} unidades)`,
    `📅 Ventas del mes: ${formatPrice(d.sales.month) ?? '$ 0'}`,
    `🧾 Pedidos de hoy: ${d.orders.hoy} · pendientes de confirmar: ${d.orders.nuevos} · en curso: ${d.orders.activos}`,
    d.top.length ? `\n🏆 Más vendidos (30 días):\n${d.top.slice(0, 3).map((t, i) => `${i + 1}. ${t.name} (${t.units} u.)`).join('\n')}` : '',
    d.lowStock.length ? `\n⚠️ Para reponer:\n${d.lowStock.slice(0, 6).map((p) => `• ${p.name}: ${p.stock_qty <= 0 ? 'SIN STOCK' : `quedan ${p.stock_qty}`}`).join('\n')}` : '\n✅ Stock al día',
    d.unshared ? `\n📣 ${d.unshared} productos sin compartir en el canal` : '',
    waiting ? `🚚 ${waiting} interesados esperando envíos` : '',
  ].filter(Boolean).join('\n');
  const missing = [!s.whatsapp_number && 'el número de WhatsApp', !s.channel_url && 'el enlace de tu canal de WhatsApp'].filter(Boolean);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-gray-500">Hola, {user.display_name || user.username} 👋</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Tu negocio hoy</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SummaryButton text={summary} owner={s.whatsapp_number} />
          <Link href="/admin/productos/nuevo" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-4 text-lg font-bold text-ink shadow-sm hover:bg-gold-deep">
            <Plus className="size-6" /> Cargar producto
          </Link>
        </div>
      </div>

      {s.payment_methods.includes('dolares') && <UsdRate rate={s.usd_rate} at={s.usd_rate_at ? safeIso(s.usd_rate_at, null) : null} />}

      {missing.length > 0 && (
        <Link href="/admin/negocio" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 hover:bg-amber-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>Falta cargar {missing.join(' y ')}. <strong className="underline">Completalo acá</strong> para que los clientes te puedan escribir.</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {d.newOrders > 0 && (
          <Link href="/admin/pedidos" className="flex items-center gap-4 rounded-2xl bg-ink p-5 text-white shadow-sm hover:bg-black">
            <span className="flex size-12 items-center justify-center rounded-xl bg-gold text-ink"><ClipboardList className="size-6" /></span>
            <span className="flex-1"><span className="block text-lg font-bold">{d.newOrders} {d.newOrders === 1 ? 'pedido nuevo' : 'pedidos nuevos'}</span><span className="text-sm text-white/60">Confirmalos y el stock se descuenta solo</span></span>
            <ArrowUpRight className="size-5 text-gold" />
          </Link>
        )}
        {d.unshared > 0 && (
          <Link href="/admin/canal" className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 hover:bg-emerald-100">
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#25d366] text-white"><WhatsAppIcon className="size-6" /></span>
            <span className="flex-1"><span className="block text-lg font-bold text-emerald-900">{d.unshared} {d.unshared === 1 ? 'producto sin compartir' : 'productos sin compartir'}</span><span className="text-sm text-emerald-800/70">Publicalos en tu canal con un toque</span></span>
            <ArrowUpRight className="size-5 text-emerald-700" />
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Ventas de hoy" value={formatPrice(d.sales.today) ?? '$ 0'} sub={`${d.sales.units7} unidades en 7 días`} />
        <Kpi icon={Wallet} label="Ventas del mes" value={formatPrice(d.sales.month) ?? '$ 0'} sub={trend == null ? `${d.sales.units30} unidades en 30 días` : <span className={trend >= 0 ? 'text-emerald-600' : 'text-red-600'}>{trend >= 0 ? <ArrowUpRight className="inline size-4" /> : <ArrowDownRight className="inline size-4" />} {Math.abs(trend)}% vs. 30 días anteriores</span>} />
        <Kpi icon={Receipt} label="Facturación total" value={formatPrice(d.sales.all_time) ?? '$ 0'} sub="Todas las ventas registradas" />
        <Kpi icon={ClipboardList} label="Pedidos" value={String(d.orders.mes)} sub={`este mes · ${d.orders.nuevos} pendientes · ${d.orders.activos} en curso`} href="/admin/pedidos" />
        <Kpi icon={Package} label="Productos publicados" value={String(d.kpi.active)} sub={`${d.kpi.hidden} ocultos`} href="/admin/productos" />
        <Kpi icon={Boxes} label="Mercadería en stock" value={formatPrice(d.kpi.value_price) ?? '$ 0'} sub={`${d.kpi.units} unidades · costo ${formatPrice(d.kpi.value_cost)}`} href="/admin/stock" />
        <Kpi icon={PackageX} label="Sin stock" value={String(d.kpi.out)} sub="productos agotados" href="/admin/productos?f=sin" warn={d.kpi.out > 0} />
        <Kpi icon={AlertTriangle} label="Stock bajo" value={String(d.kpi.low)} sub="llegaron al mínimo" href="/admin/productos?f=bajo" warn={d.kpi.low > 0} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Ventas de los últimos 30 días</h2>
          <p className="text-sm text-gray-500">Suma de ventas registradas (en el local o desde listas confirmadas)</p>
          <div className="mt-5 flex h-44 items-end gap-[3px]" role="img" aria-label="Gráfico de ventas por día">
            {d.daily.map((x) => {
              const date = new Date(x.day + 'T12:00:00');
              return (
                <div key={x.day} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="pointer-events-none absolute -top-6 z-10 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{formatPrice(x.total)}</span>
                  <div className="w-full origin-bottom animate-[grow_.8s_cubic-bezier(.2,.8,.2,1)_both] rounded-t bg-gold transition group-hover:bg-gold-deep" style={{ height: `${Math.max(2, (x.total / max) * 100)}%` }} />
                  <span className="text-[9px] text-gray-400">{date.getDate() % 5 === 0 || date.getDate() === 1 ? date.getDate() : ''}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Más vendidos (30 días)</h2>
          {d.top.length === 0 ? <p className="mt-4 text-gray-500">Todavía no hay ventas registradas.</p> : (
            <ol className="mt-3 space-y-2">
              {d.top.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="w-5 text-center font-black text-gray-400">{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t.image_id ? <img src={`/img/${t.image_id}`} alt="" className="size-10 rounded-lg object-cover" /> : <span className="size-10 rounded-lg bg-gray-100" />}
                  <Link href={`/admin/productos/${t.id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{t.name}</Link>
                  <span className="text-right text-sm"><span className="block font-bold">{t.units} u.</span><span className="text-gray-500">{formatPrice(t.total)}</span></span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-bold">Reponer pronto</h2><Link href="/admin/stock?f=alertas" className="text-sm font-semibold text-gold-deep hover:underline">Ver todo</Link></div>
          {d.lowStock.length === 0 ? <p className="mt-4 text-gray-500">Todo con buen stock. 👌</p> : (
            <ul className="mt-3 divide-y divide-gray-100">
              {d.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/stock?p=${p.id}`} className="min-w-0 truncate font-medium hover:underline">{p.name}</Link>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${p.stock_qty <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{p.stock_qty <= 0 ? 'Sin stock' : `Quedan ${p.stock_qty}`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-bold">Últimos movimientos</h2><Link href="/admin/stock#movimientos" className="text-sm font-semibold text-gold-deep hover:underline">Ver todo</Link></div>
          <ul className="mt-3 divide-y divide-gray-100">
            {d.recentMoves.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className={`w-12 shrink-0 text-right font-black tabular-nums ${m.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</span>
                <span className="min-w-0 flex-1 truncate"><span className="font-medium">{m.product_name}</span> <span className="text-gray-500">· {m.kind}{m.note ? ` · ${m.note}` : ''}</span></span>
                <span className="shrink-0 text-gray-400">{timeAgo(m.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">{d.kpi.active} productos publicados · {d.kpi.hidden} ocultos</p>
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, href, warn }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: React.ReactNode; href?: string; warn?: boolean }) {
  const body = (
    <>
      <span className={`flex size-10 items-center justify-center rounded-xl ${warn ? 'bg-red-100 text-red-600' : 'bg-gold/20 text-gold-deep'}`}><Icon className="size-5" /></span>
      <p className="mt-3 text-sm text-gray-500">{label}</p>
      <p className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
    </>
  );
  const cls = 'block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm';
  return href ? <Link href={href} className={`${cls} hover:border-gray-300`}>{body}</Link> : <div className={cls}>{body}</div>;
}
