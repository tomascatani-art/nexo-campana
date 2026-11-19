import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, PackageCheck, ShieldCheck, Tag } from 'lucide-react';
import { getPublicData, getPublicProductBySlug, getSettings } from '@/lib/data';
import { discountPct, formatPrice, siteUrl, waLink } from '@/lib/format';
import { productJsonLd } from '@/lib/seo';
import { WhatsAppIcon } from '@/components/icons';
import { Badges, ProductCard, QtyStepper } from '@/components/site/ProductCard';
import { Gallery } from '@/components/site/Gallery';
import { ShareProduct } from '@/components/site/ShareProduct';
import { VariantPicker } from '@/components/site/VariantPicker';
import { TrackView } from '@/components/site/TrackView';

export const revalidate = 300; // 5 min: las ofertas programadas se activan y terminan solas

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [p, s] = await Promise.all([getPublicProductBySlug(slug), getSettings()]);
  if (!p) return { title: 'Producto no encontrado' };
  const price = p.price != null ? ` – ${formatPrice(p.price)}` : '';
  const title = `${p.name}${price} | ${s.business_name}`;
  const description = (p.description ? p.description + ' ' : '') + `Comprá en ${s.business_name}, ${s.business_kind.toLowerCase()} en ${s.city}. Armá tu lista y consultá por WhatsApp.`;
  const image = `/compartir/${p.id}?f=og&v=${Math.round((p.price ?? 0))}`;
  return {
    metadataBase: new URL(siteUrl(s)),
    title, description,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: { type: 'website', locale: 'es_AR', siteName: s.business_name, title: `${p.name}${price}`, description, url: `/producto/${p.slug}`, images: [{ url: image, width: 1200, height: 630, alt: p.name }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { settings: s, products } = await getPublicData();
  const p = await getPublicProductBySlug(slug);
  if (!p) notFound();
  const url = `${siteUrl(s)}/producto/${p.slug}`;
  const priceTxt = p.price != null ? ` (${formatPrice(p.price)})` : '';
  const wa = waLink(s.whatsapp_number, `Hola ${s.business_name}! Quería consultar por: ${p.name}${priceTxt}\n${url}`);
  const off = discountPct(p.price, p.old_price);
  const out = p.availability === 'out';
  const cash = s.payment_methods?.includes('efectivo') && s.cash_discount_pct ? s.cash_discount_pct : null;
  const usdRate = s.payment_methods?.includes('dolares') && s.usd_rate ? s.usd_rate : null;
  const related = products.filter((x) => x.id !== p.id && x.category_slug === p.category_slug && x.availability !== 'out').slice(0, 4);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <TrackView id={p.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(s, p)).replace(/</g, '\\u003c') }} />
      <nav aria-label="Ruta" className="mb-6 flex items-center gap-1 text-sm text-mist">
        <Link href="/#catalogo" className="inline-flex items-center gap-1 hover:text-white"><ChevronLeft className="size-4" /> Catálogo</Link>
        {p.category_name && <><span>/</span><a href={`/?categoria=${p.category_slug}#catalogo`} className="hover:text-white">{p.category_name}</a></>}
      </nav>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative">
          <Gallery ids={[p.image_id, ...p.gallery].filter((x): x is string => !!x)} alt={p.name} out={out} />
          <Badges p={p} className="absolute left-4 top-4" />
        </div>
        <div>
          {p.category_name && <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">{p.category_name}</p>}
          <h1 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">{p.name}</h1>
          <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
            {p.price != null ? (
              <>
                <span className="font-display text-5xl font-black text-gold">{formatPrice(p.price)}</span>
                {p.unit_label && <span className="pb-1.5 text-mist">{p.unit_label}</span>}
                {p.old_price != null && <span className="w-full text-lg text-mist"><span className="line-through">{formatPrice(p.old_price)}</span> {off && <span className="ml-2 font-bold text-red-400">Ahorrás {off}%</span>}</span>}
              </>
            ) : <span className="font-display text-3xl font-black text-gold">Consultar precio</span>}
          </div>
          {p.offer_until && <p className="mt-2 inline-flex rounded-full bg-red-500/15 px-3 py-1 text-sm font-bold text-red-300" data-testid="offer-until">⏰ Oferta válida hasta el {new Date(p.offer_until).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })} h</p>}
          {usdRate && p.price != null && <p className="mt-2 text-mist" data-testid="usd-price">o <b className="text-white">US$ {Math.ceil(p.price / usdRate).toLocaleString('es-AR')}</b> en dólares (cotización del día)</p>}
          {cash && p.price != null && <p className="mt-3 text-lg" data-testid="cash-price">💵 <strong className="text-emerald-300">{formatPrice(Math.round(p.price * (1 - cash / 100)))}</strong> <span className="text-mist">pagando en efectivo ({cash}% OFF)</span></p>}
          {p.bulk_qty && p.bulk_price != null && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
              <Tag className="size-6 shrink-0 text-gold" />
              <p><span className="font-bold text-gold">Precio por cantidad:</span> llevando <strong>{p.bulk_qty} o más</strong>, cada uno sale <strong className="text-gold">{formatPrice(p.bulk_price)}</strong>. Se aplica solo en tu lista.</p>
            </div>
          )}
          {p.availability === 'low' && <p className="mt-4 font-bold text-red-400">¡Quedan pocas unidades!</p>}
          <div className="mt-6 max-w-md space-y-3">
            {out ? (
              <p className="rounded-xl border border-white/15 p-4 text-center font-semibold text-mist">Sin stock por ahora. Consultanos cuándo vuelve a entrar.</p>
            ) : p.variants.length ? (
              <VariantPicker p={p} />
            ) : (
              <QtyStepper id={p.id} max={p.max_qty} size="lg" />
            )}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-wa px-4 py-3.5 font-bold text-white transition hover:bg-wa-deep"><WhatsAppIcon className="size-5" /> Consultar</a>}
              <ShareProduct title={p.name} text={`${p.name}${priceTxt} en ${s.business_name}`} url={url} />
            </div>
          </div>
          {p.description && <div className="mt-8 border-t border-white/10 pt-6 text-lg leading-relaxed text-white/75">{p.description.split(/\n+/).map((l, i) => <p key={i} className="mt-2">{l}</p>)}</div>}
          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-coal p-3"><PackageCheck className="size-5 text-gold" /> Armá tu lista y retirá en el local</li>
            <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-coal p-3"><ShieldCheck className="size-5 text-gold" /> Te confirmamos stock por WhatsApp</li>
          </ul>
          {s.price_note && <p className="mt-6 text-xs text-mist">{s.price_note}</p>}
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-black sm:text-3xl">También te puede interesar</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </main>
  );
}
