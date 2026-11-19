import Link from 'next/link';
import { Download } from 'lucide-react';
import { getMovements, getProducts } from '@/lib/data';
import { formatPrice, stockState, timeAgo } from '@/lib/format';
import { PageHeader } from '@/components/admin/fields';
import { StockForm } from '@/components/admin/StockForm';

export const metadata = { title: 'Stock' };

const KIND_LABEL: Record<string, string> = { entrada: 'Entrada', venta: 'Venta', ajuste: 'Ajuste', devolucion: 'Devolución' };

export default async function Stock({ searchParams }: { searchParams: Promise<{ f?: string; p?: string; m?: string }> }) {
  const sp = await searchParams;
  const [all, moves] = await Promise.all([getProducts(), getMovements({ limit: 60, kind: ['entrada', 'venta', 'ajuste', 'devolucion'].includes(sp.m ?? '') ? sp.m : undefined, productId: sp.p && /^[0-9a-f-]{36}$/.test(sp.p) ? sp.p : undefined })]);
  const tracked = all.filter((p) => p.track_stock);
  const list = sp.f === 'alertas' ? tracked.filter((p) => stockState(p) === 'out' || stockState(p) === 'low') : tracked;
  const sorted = [...list].sort((a, b) => a.stock_qty - b.stock_qty || a.name.localeCompare(b.name));
  const units = tracked.reduce((a, p) => a + Math.max(0, p.stock_qty), 0);
  const value = tracked.reduce((a, p) => a + Math.max(0, p.stock_qty) * (p.price ?? 0), 0);
  const cost = tracked.reduce((a, p) => a + Math.max(0, p.stock_qty) * (p.cost ?? 0), 0);
  const alerts = tracked.filter((p) => p.active && stockState(p) !== 'ok').length;
  const formProducts = tracked.map((p) => ({ id: p.id, name: p.name, stock_qty: p.stock_qty, price: p.price, variants: (p.variants ?? []).map((v) => ({ id: v.id, name: v.name, stock_qty: v.stock_qty })) }));

  return (
    <>
      <PageHeader
        title="Stock"
        description="Registrá lo que entra y lo que sale. Las ventas de pedidos confirmados se descuentan solas."
        actions={<a href="/admin/exportar" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-semibold hover:bg-gray-50"><Download className="size-4" /> Exportar a Excel</a>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Unidades en stock', units.toLocaleString('es-AR')],
          ['Valor a precio de venta', formatPrice(value)],
          ['Valor a costo', formatPrice(cost)],
          ['Alertas', String(alerts)],
        ].map(([l, v]) => <div key={l} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm text-gray-500">{l}</p><p className="text-xl font-extrabold tabular-nums">{v}</p></div>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-4 text-lg font-bold">Registrar movimiento</h2>
          <StockForm products={formProducts} initialId={sp.p} />
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
            <h2 className="text-lg font-bold">Inventario</h2>
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 text-sm font-semibold">
              <Link href="/admin/stock" className={`rounded-lg px-3 py-1.5 ${sp.f !== 'alertas' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Todos</Link>
              <Link href="/admin/stock?f=alertas" className={`rounded-lg px-3 py-1.5 ${sp.f === 'alertas' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Alertas ({alerts})</Link>
            </div>
          </div>
          <ul className="max-h-[32rem] divide-y divide-gray-100 overflow-y-auto">
            {sorted.map((p) => {
              const st = stockState(p);
              return (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/stock?p=${p.id}`} className="min-w-0 flex-1">
                      <span className="block truncate font-semibold hover:underline">{p.name}</span>
                      <span className="text-xs text-gray-500">Mínimo {p.min_stock} · vendidos 30 días: {p.sold_30d ?? 0}{!p.active && ' · oculto'}</span>
                    </Link>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${st === 'out' ? 'bg-red-100 text-red-700' : st === 'low' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{p.stock_qty}</span>
                  </div>
                  {(p.variants?.length ?? 0) > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{p.variants!.map((v) => <span key={v.id} className={`rounded-md px-2 py-0.5 text-xs font-semibold ${v.stock_qty <= 0 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{v.name}: {v.stock_qty}</span>)}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section id="movimientos" className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold">Historial de movimientos{sp.p && <Link href="/admin/stock#movimientos" className="ml-2 text-sm font-semibold text-gold-deep">(ver todos)</Link>}</h2>
          <div className="no-scrollbar flex gap-1 overflow-x-auto text-sm font-semibold">
            {[['', 'Todos'], ['entrada', 'Entradas'], ['venta', 'Ventas'], ['ajuste', 'Ajustes'], ['devolucion', 'Devoluciones']].map(([v, l]) => (
              <Link key={v} href={`/admin/stock?${new URLSearchParams({ ...(v ? { m: v } : {}), ...(sp.p ? { p: sp.p } : {}) })}#movimientos`} className={`shrink-0 rounded-full border px-3 py-1.5 ${(sp.m ?? '') === v ? 'border-ink bg-ink text-white' : 'border-gray-300'}`}>{l}</Link>
            ))}
          </div>
        </div>
        {moves.length === 0 ? <p className="p-6 text-center text-gray-500">Sin movimientos.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-2.5">Cuándo</th><th className="px-4 py-2.5">Producto</th><th className="px-4 py-2.5">Tipo</th><th className="px-4 py-2.5 text-right">Cant.</th><th className="hidden px-4 py-2.5 sm:table-cell">Detalle</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {moves.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{timeAgo(m.created_at)}</td>
                    <td className="max-w-[12rem] truncate px-4 py-2.5 font-medium">{m.product_name}{m.variant_name && <span className="text-gray-500"> · {m.variant_name}</span>}</td>
                    <td className="px-4 py-2.5">{KIND_LABEL[m.kind]}</td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${m.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                    <td className="hidden px-4 py-2.5 text-gray-500 sm:table-cell">{[m.unit_price ? `${formatPrice(m.unit_price)} c/u` : null, m.note, m.created_by].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
