import type { Metadata } from 'next';
import { getPublicData, getSettings } from '@/lib/data';
import { formatPrice, siteUrl } from '@/lib/format';
import { PrintButton } from '@/components/site/PrintButton';

// Se arma en cada visita con los datos de la base: la publicación no necesita conectarse a la base
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { metadataBase: new URL(siteUrl(s)), title: `Lista de precios | ${s.business_name}`, description: `Lista de precios actualizada de ${s.business_name}.`, alternates: { canonical: '/lista-de-precios' } };
}

export default async function PriceList() {
  const { settings: s, products, categories } = await getPublicData();
  const today = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'long' }).format(new Date());
  const groups = [...categories.map((c) => ({ name: c.name, items: products.filter((p) => p.category_slug === c.slug) })), { name: 'Otros', items: products.filter((p) => !p.category_slug) }].filter((g) => g.items.length);
  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 print:pt-0 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black">Lista de precios</h1>
          <p className="mt-1 text-mist print:text-black">{s.business_name} · {[s.address, s.city].filter(Boolean).join(', ')} · Actualizada al {today}</p>
        </div>
        <div className="flex gap-2"><a href="/lista-de-precios-pdf" className="no-print inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-bold text-ink hover:bg-gold-soft">Descargar PDF</a><PrintButton /></div>
      </div>
      {groups.map((g) => (
        <section key={g.name} className="mt-10 break-inside-avoid">
          <h2 className="border-b-2 border-gold pb-2 font-display text-xl font-extrabold uppercase tracking-wider text-gold print:text-black">{g.name}</h2>
          <table className="mt-2 w-full text-left">
            <thead className="sr-only"><tr><th>Producto</th><th>Precio</th><th>Por cantidad</th></tr></thead>
            <tbody className="divide-y divide-white/10 print:divide-gray-300">
              {g.items.map((p) => (
                <tr key={p.id} className={p.availability === 'out' ? 'text-mist' : ''}>
                  <td className="py-2.5 pr-3">{p.name}{p.unit_label && <span className="text-mist print:text-gray-600"> · {p.unit_label}</span>}{p.availability === 'out' && <span className="ml-2 text-xs font-bold uppercase">(sin stock)</span>}</td>
                  <td className="whitespace-nowrap py-2.5 text-right font-bold tabular-nums">{formatPrice(p.price) ?? 'Consultar'}</td>
                  <td className="hidden whitespace-nowrap py-2.5 pl-4 text-right text-sm text-gold tabular-nums print:text-black sm:table-cell">{p.bulk_qty && p.bulk_price != null ? `${p.bulk_qty}+ a ${formatPrice(p.bulk_price)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {s.price_note && <p className="mt-10 text-sm text-mist print:text-black">{s.price_note}</p>}
    </main>
  );
}
