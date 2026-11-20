import { requireAdmin } from '@/lib/auth';
import { getCustomers, getSettings } from '@/lib/data';
import { formatPrice, safeIso, siteUrl, timeAgo } from '@/lib/format';
import { waIntl } from '@/lib/messages';
import { PageHeader } from '@/components/admin/fields';
import { WhatsAppIcon } from '@/components/icons';
import { CopyPhones } from './CopyPhones';
import { RemoveNoShow } from './RemoveNoShow';
import { getNoShows } from '@/lib/orders';

export const metadata = { title: 'Clientes' };

export default async function Clientes() {
  await requireAdmin();
  const [list, s, noShows] = await Promise.all([getCustomers(), getSettings(), getNoShows().catch(() => [])]);
  const site = siteUrl(s);
  const frequent = list.filter((c) => c.orders >= 2).length;
  return (
    <>
      <PageHeader title="Clientes" description="Se arma solo con los pedidos de la web. Los que más compran arriba: mandales ofertas por WhatsApp." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">{list.length} clientes · {frequent} frecuentes (2+ pedidos)</span>
        {list.length > 0 && <CopyPhones phones={list.map((c) => c.phone)} />}
      </div>
      <section id="no-retiraron" className="mb-6 scroll-mt-24 rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">🚫 No retiraron ({noShows.length})</h2>
        <p className="mt-1 text-sm text-gray-600">Clientes que pidieron y no vinieron a buscar el pedido. Cuando vuelven a pedir, la web les avisa que tienen que dejar una seña del {s.noshow_deposit_pct ?? 20}% y el pedido te aparece marcado. Se agregan desde el pedido, con el botón “No lo retiró”.</p>
        {noShows.length === 0 ? (
          <p className="mt-3 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">Nadie por ahora 🙌</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {noShows.map((n) => (
              <li key={n.phone_key} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.name || 'Sin nombre'} <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{n.times === 1 ? '1 vez' : `${n.times} veces`}</span></p>
                  <p className="text-sm text-gray-500">{n.phone}{n.last_order_code ? ` · último: pedido #${n.last_order_code}` : ''} · {timeAgo(safeIso(n.updated_at))}</p>
                </div>
                <RemoveNoShow phone={n.phone} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">Cuando entren pedidos por la web, los clientes aparecen acá.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c, i) => {
            const first = c.name.split(' ')[0];
            const text = `¡Hola ${first}! Te escribimos de ${s.business_name} 👋 Gracias por elegirnos. Esta semana entró mercadería nueva y tenemos ofertas para vos: ${site}`;
            return (
              <li key={c.phone_digits} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? 'bg-gold text-ink' : 'bg-gray-100 text-gray-600'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name} {c.orders >= 2 && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">FRECUENTE</span>}</p>
                  <p className="text-sm text-gray-500">{c.phone} · {c.orders} {c.orders === 1 ? 'pedido' : 'pedidos'} · último {timeAgo(safeIso(c.last_at))}</p>
                </div>
                <span className="font-bold tabular-nums">{formatPrice(c.total)}</span>
                <a href={`https://wa.me/${waIntl(c.phone)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25d366] px-3 py-2 text-sm font-bold text-white"><WhatsAppIcon className="size-4" /> Mandar oferta</a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
