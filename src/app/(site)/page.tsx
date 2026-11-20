import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Bell, ClipboardList, Clock, MapPin, Navigation, PackageCheck, Store, Truck, Wallet } from 'lucide-react';
import { getPublicData } from '@/lib/data';
import { groupHours, siteUrl, specialDayLabel, specialText, waLink } from '@/lib/format';
import { SHIPPING_SOON_DEFAULT } from '@/lib/types';
import { ShippingSoon } from '@/components/site/ShippingSoon';
import { ReviewForm } from '@/components/site/ReviewForm';
import { buildJsonLd } from '@/lib/seo';
import { formatPrice, surchargeText } from '@/lib/pricing';
import { CategoryIcon, InstagramIcon, WhatsAppIcon } from '@/components/icons';
import { Catalog, CategoryTile } from '@/components/site/Catalog';
import { ProductCard } from '@/components/site/ProductCard';
import { OpenStatus } from '@/components/site/OpenStatus';
import { Monogram } from '@/components/site/Logo';
import { HeroVideo } from '@/components/site/HeroVideo';

// Se arma en cada visita con los datos de la base: la publicación no necesita conectarse a la base
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { settings: s } = await getPublicData();
  const title = s.seo_title || `${s.business_name} | ${s.business_kind} en ${s.city ?? ''}`;
  const description = s.seo_description || s.hero_subtitle || '';
  return {
    metadataBase: new URL(siteUrl(s)),
    title, description,
    keywords: [s.business_name, 'NEXO', 'mayorista y minorista Campana', 'electrodomésticos Campana', 'bazar Campana', 'hogar', 'tecnología', 'mayorista Campana', 'minorista Campana', s.city ?? ''].filter(Boolean),
    alternates: { canonical: '/' },
    openGraph: { type: 'website', locale: 'es_AR', siteName: s.business_name, title, description, url: '/' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function Home() {
  const { settings: s, hours, specials, categories, products, reviews } = await getPublicData();
  const shipsNow = s.shipping_mode === 'activo';
  const offers = products.filter((p) => p.old_price != null && p.price != null && p.old_price > p.price && p.availability !== 'out').slice(0, 8);
  const featured = products.filter((p) => p.featured && p.availability !== 'out' && !offers.includes(p)).slice(0, 4);
  const bestSellers = [...products].filter((p) => p.sold_30d > 0 && p.availability !== 'out').sort((a, b) => b.sold_30d - a.sold_30d).slice(0, 4);
  const newest = [...products].filter((p) => p.availability !== 'out').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);
  const fullAddress = [s.address, s.city, s.province].filter(Boolean).join(', ');
  const mapsQuery = encodeURIComponent(s.maps_query || fullAddress);
  const wa = waLink(s.whatsapp_number, `Hola ${s.business_name}! Quería hacer una consulta.`);
  const title = s.hero_title || s.slogan || s.business_name;
  const [t1, t2] = splitTitle(title);
  const video = s.hero_video_on ? { src: s.hero_video_id ? `/media/${s.hero_video_id}` : '/video/nexo-entrada.mp4', poster: s.hero_poster_id ? `/img/${s.hero_poster_id}` : '/video/nexo-entrada.jpg' } : null;
  const welcome = s.hero_welcome?.trim().slice(0, 40) || null;
  const surText = s.payment_methods?.includes('transferencia') ? surchargeText(s.transfer_surcharge_pct, categories.filter((c) => c.transfer_surcharge_pct != null).map((c) => ({ name: c.name, pct: c.transfer_surcharge_pct! }))) : null;
  const policies = [
    surText ? `Las transferencias tienen recargo: ${surText}.` : null,
    s.payment_methods?.includes('transferencia') ? s.transfer_notice : null,
    s.payment_methods?.includes('dolares') ? 'Aceptamos dólares a la cotización del día (el valor se confirma en el local).' : null,
    s.payment_methods?.includes('efectivo') && s.cash_discount_pct ? `Pagando en efectivo tenés ${s.cash_discount_pct}% de descuento.` : null,
    s.refund_policy,
    s.admission_notice,
  ].filter((x): x is string => !!x);
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(s, hours, products)).replace(/</g, '\\u003c') }} />

      {/* ------------------------------------------------ PORTADA */}
      <section id="inicio" className={`relative isolate flex overflow-hidden ${video ? 'min-h-[100svh] items-end pb-20 pt-40 lg:items-center lg:pb-16' : 'min-h-[92svh] items-end pb-14 pt-40 sm:items-center sm:pb-20 sm:pt-44'}`}>
        {video ? (
          <>
            <HeroVideo src={video.src} poster={video.poster} />
            {/* capas para que el texto se lea y quede en la paleta negro y dorado */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/45 to-ink/55 lg:bg-gradient-to-r lg:from-ink lg:via-ink/85 lg:to-ink/30" />
            <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-ink to-transparent" />
            <div className="glow-pulse absolute -left-32 bottom-10 -z-10 size-[30rem] rounded-full bg-gold/20 blur-3xl" />
          </>
        ) : (
          <>
            {s.hero_image_id && <Image src={`/img/${s.hero_image_id}`} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-60" />}
            <div className="grid-bg absolute inset-0 -z-10" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
            <div className="absolute -right-40 top-10 -z-10 size-[38rem] rounded-full bg-gold/15 blur-3xl" />
          </>
        )}
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className={video ? 'max-w-2xl lg:max-w-[min(42rem,calc(100%-24rem))]' : 'max-w-3xl'}>
            {video && welcome && (
              <div className="mb-6" data-testid="hero-welcome">
                <p className="welcome shine font-display text-[clamp(2rem,11vw,3.2rem)] font-black uppercase leading-[1.05] tracking-[0.05em] drop-shadow-[0_6px_30px_rgb(0_0_0/.6)] sm:text-7xl lg:text-[clamp(3.5rem,5.6vw,6rem)]" aria-label={welcome}>
                  {welcome.split(/(\s+)/).reduce<{ parts: React.ReactNode[]; i: number }>((acc, w, k) => {
                    if (/^\s+$/.test(w)) { acc.parts.push(' '); acc.i += 1; return acc; }
                    acc.parts.push(<span key={k} className="inline-block whitespace-nowrap">{[...w].map((c, j) => <span key={j} aria-hidden className="ch" style={{ ['--i' as string]: acc.i + j }}>{c}</span>)}</span>);
                    acc.i += w.length;
                    return acc;
                  }, { parts: [], i: 0 }).parts}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="welcome-line h-[3px] w-16 rounded-full bg-gradient-to-r from-gold to-gold-soft sm:w-24" style={{ ['--d' as string]: `${welcome.length * 55 + 600}ms` }} />
                  <span className="fade-up font-display text-sm font-bold uppercase tracking-[0.35em] text-white/85 sm:text-base" style={{ ['--d' as string]: `${welcome.length * 55 + 800}ms` }}>a {s.business_name}</span>
                </div>
              </div>
            )}
            <div className={`${video ? 'fade-up' : 'reveal'} flex flex-wrap items-center gap-3`} style={{ ['--d' as string]: video ? '1100ms' : '0ms' }}>
              <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-gold backdrop-blur">{s.business_kind} · {s.city}</span>
              <OpenStatus hours={hours} specials={specials} />
            </div>
            <h1 className={`${video ? 'fade-up mt-5 text-[2.2rem] sm:text-6xl' : 'reveal mt-6 text-[2.6rem] sm:text-7xl'} font-display font-black leading-[1.02] tracking-tight`} style={{ ['--d' as string]: video ? '1250ms' : '80ms' }}>
              {t1} <span className="gold-text">{t2}</span>
            </h1>
            {s.tagline && !video && <p className="reveal mt-5 font-display text-base font-bold uppercase tracking-[0.12em] text-white/80 sm:text-xl sm:tracking-[0.2em]" style={{ ['--d' as string]: '140ms' }}>{s.tagline}</p>}
            {s.hero_subtitle && <p className={`${video ? 'fade-up text-base sm:text-lg' : 'reveal text-lg'} mt-4 max-w-xl text-white/75`} style={{ ['--d' as string]: video ? '1380ms' : '200ms' }}>{s.hero_subtitle}</p>}
            <div className={`${video ? 'fade-up' : 'reveal'} mt-8 flex flex-col gap-3 sm:flex-row`} style={{ ['--d' as string]: video ? '1500ms' : '260ms' }}>
              <Link href="#catalogo" className="btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-4 text-lg font-bold text-ink shadow-xl shadow-gold/20 transition hover:bg-gold-soft active:scale-95">
                Ver catálogo y precios <ArrowRight className="size-5" />
              </Link>
              {s.channel_url ? (
                <a href={s.channel_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-wa/60 bg-wa/10 px-7 py-4 text-lg font-bold text-white transition hover:bg-wa/20">
                  <WhatsAppIcon className="size-5 text-wa" /> Unite a nuestro canal
                </a>
              ) : wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-lg font-bold text-white transition hover:bg-white/10">
                  <WhatsAppIcon className="size-5 text-wa" /> Consultar por WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
        {video && <a href="#catalogo" aria-label="Bajar al catálogo" className="scroll-hint absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-gold/80 sm:block lg:hidden"><svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></a>}
      </section>

      {/* ------------------------------------------------ CINTA */}
      <div className="overflow-hidden border-y border-gold/20 bg-gold py-3 text-ink">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap font-display text-sm font-black uppercase tracking-[0.2em]">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['Mayorista y minorista', 'Electro', 'Hogar', 'Tecnología', 'Bazar', 'Mercadería nueva todas las semanas', 'Armá tu lista y mandala por WhatsApp'].map((t) => <span key={`${k}${t}`} className="flex items-center gap-10">{t} <span aria-hidden>✦</span></span>))}
        </div>
      </div>

      {/* ------------------------------------------------ CATEGORÍAS */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {categories.map((c, i) => (
              <CategoryTile key={c.id} slug={c.slug} delay={i * 50}>
                {c.image_id ? (
                  <span className="relative size-16 overflow-hidden rounded-full bg-white ring-2 ring-gold/30 transition group-hover:ring-gold"><Image src={`/img/${c.image_id}`} alt="" fill sizes="64px" className="object-cover transition duration-500 group-hover:scale-110" /></span>
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-gold/10 text-gold transition group-hover:bg-gold group-hover:text-ink"><CategoryIcon name={c.icon} className="size-7" /></span>
                )}
                <span className="text-sm font-bold leading-tight">{c.name}</span>
                <span className="text-xs text-mist">{c.product_count} productos</span>
              </CategoryTile>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ OFERTAS */}
      {offers.length > 0 && (
        <section id="ofertas" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <SectionTitle kicker="Aprovechá" title="Ofertas de la semana" link={{ href: '#catalogo', label: 'Ver todo' }} />
          <div className="no-scrollbar -mx-4 mt-8 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 xl:grid-cols-4">
            {offers.map((p) => <div key={p.id} className="w-[46vw] shrink-0 snap-start sm:w-auto"><ProductCard p={p} /></div>)}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ MÁS VENDIDOS */}
      {bestSellers.length >= 2 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <SectionTitle kicker="Lo que más se llevan" title="Más vendidos" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {bestSellers.map((p, i) => (
              <div key={p.id} className="relative">
                <span className="absolute -left-2 -top-3 z-10 flex size-9 items-center justify-center rounded-full bg-gold font-display text-lg font-black text-ink shadow-lg">{i + 1}</span>
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ DESTACADOS */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <SectionTitle kicker="Lo más buscado" title="Destacados" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ CANAL */}
      {(s.channel_url || wa) && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <div className="reveal relative overflow-hidden rounded-3xl border border-wa/30 bg-gradient-to-br from-[#0c2a1a] via-coal to-coal p-7 sm:p-12">
            <div className="absolute -right-16 -top-16 size-72 rounded-full bg-wa/20 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-wa"><Bell className="size-4" /> Enterate primero</p>
                <h2 className="mt-3 font-display text-3xl font-black sm:text-4xl">Las novedades llegan primero a nuestro canal de WhatsApp</h2>
                <p className="mt-3 max-w-xl text-white/70">Cada producto nuevo que entra al depósito lo publicamos con foto y precio. Seguinos y no te pierdas las ofertas.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                {s.channel_url && <a href={s.channel_url} target="_blank" rel="noopener noreferrer" className="btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-wa px-7 py-4 font-bold text-white transition hover:bg-wa-deep"><WhatsAppIcon className="size-5" /> Seguir el canal</a>}
                <Link href="/novedades" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 font-bold transition hover:bg-white/10">Ver novedades <ArrowRight className="size-5" /></Link>
              </div>
            </div>
            {newest.length > 0 && (
              <div className="relative mt-8 grid grid-cols-4 gap-2 sm:gap-4">
                {newest.map((p) => (
                  <Link key={p.id} href={`/producto/${p.slug}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-white">
                    {p.image_id && <Image src={`/img/${p.image_id}`} alt={p.name} fill sizes="25vw" className="object-cover transition group-hover:scale-105" />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ CATÁLOGO */}
      <section id="catalogo" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionTitle kicker="Todo lo que tenemos" title="Catálogo con precios" />
        {s.price_note && <p className="mt-3 max-w-2xl text-sm text-mist">{s.price_note}</p>}
        <div className="mt-6">
          <Catalog products={products} categories={categories} />
        </div>
      </section>

      {/* ------------------------------------------------ CÓMO COMPRAR */}
      <section id="como-comprar" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionTitle kicker="Fácil y sin vueltas" title="¿Cómo comprar?" />
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            [ClipboardList, 'Armá tu lista', 'Sumá productos y cantidades. Ves el total al instante, como en el súper.'],
            [WhatsAppIcon, 'Mandala por WhatsApp', 'Con un toque nos llega tu lista ordenada con precios y total.'],
            [PackageCheck, 'Te la preparamos', 'Te confirmamos stock y la dejamos lista para que no esperes.'],
            shipsNow
              ? [Wallet, 'Retirás o te la enviamos', 'Pasás por el local o te la llevamos. Pagás al recibir: sin compras online ni sorpresas.']
              : [Wallet, 'Retirás y pagás', 'Pasás por el local, pagás y te la llevás. Sin compras online ni sorpresas.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as React.ComponentType<{ className?: string }>;
            return (
              <li key={t as string} className="reveal relative rounded-2xl border border-white/10 bg-coal p-6" style={{ ['--d' as string]: `${i * 90}ms` }}>
                <span className="absolute right-5 top-4 font-display text-5xl font-black text-white/5">{i + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-gold text-ink"><I className="size-6" /></span>
                <h3 className="mt-5 font-display text-xl font-extrabold">{t as string}</h3>
                <p className="mt-2 text-mist">{d as string}</p>
              </li>
            );
          })}
        </ol>
        {s.shipping_mode === 'proximamente' && <div className="reveal mt-4"><ShippingSoon text={s.shipping_soon_text || SHIPPING_SOON_DEFAULT} /></div>}
        {policies.length > 0 && (
          <div id="politicas" className="reveal mt-4 rounded-2xl border border-gold/30 bg-coal p-5" data-testid="policies">
            <p className="font-display text-lg font-black text-gold">Políticas del local</p>
            <ul className="mt-3 space-y-2 text-white/85">{policies.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="text-gold">✦</span> {t}</li>)}</ul>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ OPINIONES */}
      <section id="opiniones" className="mx-auto max-w-7xl scroll-mt-28 px-4 pt-24 sm:px-6">
        <SectionTitle kicker="Lo que dicen nuestros clientes" title="Opiniones" />
        {reviews.count > 0 && <p className="reveal mt-3 text-lg"><span className="text-gold">{'★'.repeat(Math.round(reviews.avg ?? 0))}</span> <b>{reviews.avg?.toLocaleString('es-AR')}</b> <span className="text-mist">· {reviews.count} {reviews.count === 1 ? 'opinión' : 'opiniones'}</span></p>}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          {reviews.list.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {reviews.list.slice(0, 6).map((r) => (
                <li key={r.id} className="reveal rounded-2xl border border-white/10 bg-coal p-5">
                  <p className="text-gold" aria-label={`${r.rating} de 5 estrellas`}>{'★'.repeat(r.rating)}<span className="text-white/20">{'★'.repeat(5 - r.rating)}</span></p>
                  <p className="mt-2 text-white/80">“{r.text}”</p>
                  <p className="mt-3 text-sm font-bold">{r.name}</p>
                </li>
              ))}
            </ul>
          ) : <p className="reveal self-center text-lg text-mist">Todavía no hay opiniones publicadas. ¡Sé el primero en contarnos cómo te fue!</p>}
          <ReviewForm />
        </div>
      </section>

      {/* ------------------------------------------------ NOSOTROS */}
      <section id="nosotros" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="reveal relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-coal">
            {s.about_image_id && <Image src={`/img/${s.about_image_id}`} alt={`Local de ${s.business_name}`} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />}
            <div className="absolute inset-0 flex items-center justify-center"><Monogram className={`size-40 drop-shadow-2xl ${s.about_image_id ? 'opacity-0' : ''}`} /></div>
          </div>
          <div>
            <p className="reveal text-sm font-bold uppercase tracking-[0.25em] text-gold">Nosotros</p>
            <h2 className="reveal mt-3 font-display text-3xl font-black sm:text-5xl">{s.about_title || s.business_name}</h2>
            <div className="reveal mt-5 space-y-4 text-lg text-white/70">
              {(s.about_text || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <ul className="reveal mt-8 grid grid-cols-2 gap-3">
              {[[Store, 'Depósito propio'], [BadgeCheck, 'Calidad garantizada'], [Wallet, 'Mayorista y minorista'], [Truck, 'Mercadería nueva cada semana']].map(([Icon, t]) => {
                const I = Icon as React.ComponentType<{ className?: string }>;
                return <li key={t as string} className="flex items-center gap-3 rounded-xl border border-white/10 bg-coal p-3 text-sm font-semibold"><I className="size-5 shrink-0 text-gold" /> {t as string}</li>;
              })}
            </ul>
            {s.instagram_url && (
              <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="reveal mt-6 inline-flex items-center gap-2 font-bold text-gold hover:underline"><InstagramIcon className="size-5" /> Seguinos en Instagram</a>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ UBICACIÓN */}
      <section id="ubicacion" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionTitle kicker="Te esperamos" title="Ubicación y horarios" />
        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-coal p-6">
              <p className="flex items-center gap-2 font-display text-lg font-extrabold"><MapPin className="size-5 text-gold" /> Dirección</p>
              <p className="mt-2 text-white/80">{fullAddress}</p>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-bold text-ink hover:bg-gold-soft"><Navigation className="size-4" /> Cómo llegar</a>
            </div>
            <div className="rounded-2xl border border-white/10 bg-coal p-6">
              <p className="flex items-center justify-between gap-2 font-display text-lg font-extrabold"><span className="flex items-center gap-2"><Clock className="size-5 text-gold" /> Horarios</span> <OpenStatus hours={hours} specials={specials} /></p>
              <ul className="mt-3 divide-y divide-white/10">
                {groupHours(hours).map((g) => <li key={g.label} className="flex justify-between gap-4 py-2.5"><span className="text-white/80">{g.label}</span><span className={g.text === 'Cerrado' ? 'text-mist' : 'font-semibold'}>{g.text}</span></li>)}
              </ul>
              {specials.length > 0 && (
                <div className="mt-4 rounded-xl border border-gold/25 bg-gold/[0.06] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gold">Feriados y días especiales</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {specials.slice(0, 6).map((d) => <li key={d.id} className="flex justify-between gap-4"><span><span className="font-semibold">{specialDayLabel(d.day)}</span> <span className="text-mist">· {d.reason}</span></span><span className={d.is_open ? 'font-semibold' : 'text-mist'}>{d.is_open ? specialText(d).replace('abrimos de ', '') : 'Cerrado'}</span></li>)}
                  </ul>
                </div>
              )}
            </div>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-wa p-5 text-lg font-bold transition hover:bg-wa-deep"><WhatsAppIcon className="size-6" /> Escribinos por WhatsApp</a>
            )}
          </div>
          <div className="min-h-80 overflow-hidden rounded-2xl border border-white/10 bg-coal">
            <iframe title={`Mapa: ${fullAddress}`} src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`} className="size-full min-h-80 grayscale invert-[.9] hue-rotate-180" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>
    </main>
  );
}

function splitTitle(t: string): [string, string] {
  const parts = t.split(/,\s*/);
  if (parts.length >= 2) return [parts[0] + ',', parts.slice(1).join(', ')];
  const w = t.split(' ');
  const cut = Math.ceil(w.length / 2);
  return [w.slice(0, cut).join(' '), w.slice(cut).join(' ')];
}

function SectionTitle({ kicker, title, link }: { kicker: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="reveal flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-gold">{kicker}</p>
        <h2 className="mt-2 font-display text-3xl font-black sm:text-5xl">{title}</h2>
      </div>
      {link && <Link href={link.href} className="hidden shrink-0 items-center gap-1 font-bold text-gold hover:underline sm:inline-flex">{link.label} <ArrowRight className="size-4" /></Link>}
    </div>
  );
}
