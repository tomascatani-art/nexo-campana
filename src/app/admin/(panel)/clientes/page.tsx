import { requireAdmin } from '@/lib/auth';
import { getCustomers, getSettings } from '@/lib/data';
import { formatPrice, safeIso, siteUrl, timeAgo } from '@/lib/format';
import { waIntl } from '@/lib/messages';
import { PageHeader } from '@/components/admin/fields';
import { WhatsAppIcon } from '@/components/icons';
import { CopyPhones } from './CopyPhones';

export const metadata = { title: 'Clientes' };

export default async function Clientes() {
  await requireAdmin();
  const [list, s] = await Promise.all([getCustomers(), getSettings()]);
  const site = siteUrl(s);
  const frequent = list.filter((c) => c.orders >= 2).length;
  return (
    <>
      <PageHeader title="Clientes" description="Se arma solo con los pedidos de la web. Los que más compran arriba: mandales ofertas por WhatsApp." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">{list.length} clientes · {frequent} frecuentes (2+ pedidos)</span>
        {list.length > 0 && <CopyPhones phones={list.map((c) => c.phone)} />}
      </div>
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
