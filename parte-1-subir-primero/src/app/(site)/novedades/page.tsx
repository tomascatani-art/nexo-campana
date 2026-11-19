import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicData, getSettings } from '@/lib/data';
import { siteUrl } from '@/lib/format';
import { ProductCard } from '@/components/site/ProductCard';
import { WhatsAppIcon } from '@/components/icons';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl(s)),
    title: `Novedades | ${s.business_name}`,
    description: `Lo último que entró a ${s.business_name}: productos nuevos con foto y precio.`,
    alternates: { canonical: '/novedades' },
    openGraph: { title: `Novedades de ${s.business_name}`, description: 'Productos nuevos con foto y precio. Armá tu lista y mandala por WhatsApp.', url: '/novedades', images: [{ url: '/compartir/novedades', width: 1200, height: 630 }] },
  };
}

export default async function Novedades() {
  const { settings: s, products } = await getPublicData();
  const list = [...products].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40);
  const groups = new Map<string, typeof list>();
  for (const p of list) {
    const d = new Date(p.created_at);
    const key = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-gold">Recién llegados</p>
      <h1 className="mt-2 font-display text-4xl font-black sm:text-6xl">Novedades</h1>
      <p className="mt-3 max-w-xl text-mist">Lo último que entró al depósito. Sumalo a tu lista y mandala por WhatsApp.</p>
      {s.channel_url && <a href={s.channel_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-wa px-6 py-3 font-bold"><WhatsAppIcon className="size-5" /> Seguí el canal para enterarte primero</a>}
      {[...groups].map(([day, items]) => (
        <section key={day} className="mt-12">
          <h2 className="border-b border-white/10 pb-3 font-display text-xl font-extrabold capitalize text-white/90">{day}</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      ))}
      <div className="mt-14 text-center"><Link href="/#catalogo" className="rounded-full border border-gold/60 px-8 py-3.5 font-bold text-gold hover:bg-gold hover:text-ink">Ver todo el catálogo</Link></div>
    </main>
  );
}
