import Link from 'next/link';
import { Search, Store, Truck } from 'lucide-react';
import { getOrders } from '@/lib/data';
import { formatPrice, timeAgo } from '@/lib/format';
import { PageHeader } from '@/components/admin/fields';
import { StatusBadge } from '@/components/admin/OrderStatus';

export const metadata = { title: 'Pedidos' };

const TABS = [
  ['activos', 'En curso'],
  ['pendiente', 'Pendientes'],
  ['confirmado', 'Confirmados'],
  ['preparando', 'Preparando'],
  ['enviado', 'Enviados'],
  ['entregado', 'Entregados'],
  ['cancelado', 'Cancelados'],
  ['todos', 'Todos'],
] as const;

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ e?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([v]) => v === sp.e) ? sp.e! : 'activos';
  const orders = await getOrders({ status: tab === 'todos' ? undefined : tab, search: sp.q });
  return (
    <>
      <PageHeader title="Pedidos" description="Los pedidos que hacen los clientes desde la web. Al confirmar uno, el stock se descuenta solo." />
      <form className="mb-3 flex gap-2" action="/admin/pedidos">
        <input type="hidden" name="e" value={tab} />
        <label className="relative flex-1">
          <span className="sr-only">Buscar pedido</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={sp.q} placeholder="N° de pedido, nombre o teléfono" className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-3 outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30" />
        </label>
        <button className="rounded-xl bg-ink px-4 font-semibold text-white">Buscar</button>
      </form>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {TABS.map(([v, l]) => (
          <Link key={v} href={`/admin/pedidos?e=${v}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === v ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-gray-700'}`}>{l}</Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">No hay pedidos en esta sección.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/pedidos/${o.id}`} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:w-56">
                  <span className="flex h-12 min-w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 px-2 text-sm font-black text-gray-700">#{o.code}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{o.customer_name}</p>
                    <p className="text-sm text-gray-500">{timeAgo(o.created_at)}</p>
                  </div>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-gray-600">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="flex items-center gap-1 text-sm text-gray-500">{o.delivery_method === 'envio' ? <Truck className="size-4" /> : <Store className="size-4" />}{o.delivery_method === 'envio' ? 'Envío' : 'Retiro'}</span>
                  <span className="font-extrabold tabular-nums">{formatPrice(o.total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
