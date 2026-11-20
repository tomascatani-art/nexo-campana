import type { Metadata } from 'next';
import { getPublicData } from '@/lib/data';
import { formatPrice, siteUrl } from '@/lib/format';
import { Monogram } from '@/components/site/Logo';
import { PdfActions } from './PdfActions';

// Se arma en cada visita con los datos de la base: la publicación no necesita conectarse a la base
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Lista de precios (PDF)', robots: { index: false } };

/** Lista de precios con la marca, lista para imprimir o "Guardar como PDF" (A4). */
export default async function PriceListPdf() {
  const { settings: s, products, categories } = await getPublicData();
  const today = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'long' }).format(new Date());
  const cash = s.payment_methods?.includes('efectivo') && s.cash_discount_pct ? s.cash_discount_pct : null;
  const groups = [...categories.map((c) => ({ name: c.name, items: products.filter((p) => p.category_slug === c.slug) })), { name: 'Otros', items: products.filter((p) => !p.category_slug) }]
    .map((g) => ({ ...g, items: g.items.filter((p) => p.availability !== 'out') }))
    .filter((g) => g.items.length);
  const hasBulk = products.some((p) => p.bulk_qty && p.bulk_price != null);
  const web = siteUrl(s).replace(/^https?:\/\//, '');
  const wa = s.whatsapp_number ? `+${s.whatsapp_number}` : s.phone;
  return (
    <div className="min-h-screen overflow-x-hidden bg-neutral-200 py-6 text-neutral-900 print:bg-white print:py-0">
      <style>{`@page{size:A4;margin:12mm 10mm} @media print{.no-print{display:none!important} body{background:#fff!important} .sheet{box-shadow:none!important;margin:0!important;width:auto!important;padding:0!important}} tr{break-inside:avoid}`}</style>
      <PdfActions />
      <div className="sheet mx-auto w-[210mm] bg-white p-[10mm] shadow-xl">
        <header className="flex items-center gap-5 rounded-xl bg-[#0b0b0c] px-6 py-5 text-white" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <Monogram className="size-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-3xl font-black tracking-wide text-[#d4af37]">{s.business_name}</p>
            <p className="text-sm uppercase tracking-[0.25em] text-white/70">{s.tagline || s.business_kind}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-black">LISTA DE PRECIOS</p>
            <p className="text-sm text-white/70">{today}</p>
          </div>
        </header>
        <p className="mt-3 flex flex-wrap justify-between gap-x-4 text-xs text-neutral-600">
          <span>📍 {[s.address, s.city].filter(Boolean).join(', ')}</span>
          {wa && <span>💬 WhatsApp {wa}</span>}
          <span>🌐 {web}</span>
          {s.instagram_url && <span>📷 @{s.instagram_url.replace(/\/$/, '').split('/').pop()}</span>}
        </p>
        {groups.map((g) => (
          <section key={g.name} className="mt-6">
            <h2 className="rounded-md bg-[#d4af37] px-3 py-1.5 font-display text-sm font-black uppercase tracking-widest text-[#0b0b0c]" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>{g.name}</h2>
            <table className="mt-1 w-full table-fixed text-left text-[13px]">
              <colgroup><col /><col className="w-[34mm]" />{cash && <col className="w-[26mm]" />}{hasBulk && <col className="w-[30mm]" />}</colgroup>
              <thead className="text-[11px] uppercase text-neutral-500">
                <tr><th className="py-1.5 font-semibold">Producto</th><th className="py-1.5 text-right font-semibold">Precio</th>{cash && <th className="py-1.5 pl-3 text-right font-semibold">Efectivo -{cash}%</th>}{hasBulk && <th className="py-1.5 pl-3 text-right font-semibold">Mayorista</th>}</tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {g.items.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-3">{p.name}{p.unit_label && <span className="text-neutral-500"> · {p.unit_label}</span>}{p.old_price != null && p.price != null && <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>OFERTA</span>}</td>
                    <td className="whitespace-nowrap py-1.5 text-right font-bold tabular-nums">{p.old_price != null && p.price != null && <span className="mr-1.5 text-xs font-normal text-neutral-400 line-through">{formatPrice(p.old_price)}</span>}{formatPrice(p.price) ?? 'Consultar'}</td>
                    {cash && <td className="whitespace-nowrap py-1.5 pl-3 text-right tabular-nums">{p.price != null ? formatPrice(Math.round(p.price * (1 - cash / 100))) : ''}</td>}
                    {hasBulk && <td className="whitespace-nowrap py-1.5 pl-3 text-right text-xs tabular-nums">{p.bulk_qty && p.bulk_price != null ? `${p.bulk_qty}+ u. ${formatPrice(p.bulk_price)}` : ''}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        <footer className="mt-8 border-t-2 border-[#d4af37] pt-3 text-xs text-neutral-600">
          <p>Precios en pesos, sujetos a cambios sin previo aviso y a disponibilidad de stock.{s.price_note ? ` ${s.price_note}` : ''}</p>
          <p className="mt-1 font-semibold text-neutral-800">Hacé tu pedido en {web} o por WhatsApp.</p>
        </footer>
      </div>
    </div>
  );
}
