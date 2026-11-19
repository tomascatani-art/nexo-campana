'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Category, PublicProduct } from '@/lib/types';
import { CategoryIcon } from '@/components/icons';
import { ProductCard } from './ProductCard';

const SORTS = [
  ['destacados', 'Destacados'],
  ['populares', 'Más vendidos'],
  ['nuevos', 'Más nuevos'],
  ['menor', 'Menor precio'],
  ['mayor', 'Mayor precio'],
] as const;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Catalog({ products, categories, initialCategory = '' }: { products: PublicProduct[]; categories: Category[]; initialCategory?: string }) {
  const [cat, setCat] = useState(initialCategory);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>('destacados');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [limit, setLimit] = useState(24);

  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    let r = products.filter((p) =>
      (!cat || p.category_slug === cat) &&
      (!onlyOffers || (p.old_price != null && p.price != null && p.old_price > p.price) || p.bulk_price != null) &&
      words.every((w) => norm(`${p.name} ${p.category_name ?? ''} ${p.description ?? ''}`).includes(w)));
    const price = (p: PublicProduct) => p.price ?? Infinity;
    if (sort === 'populares') r = [...r].sort((a, b) => b.sold_30d - a.sold_30d);
    if (sort === 'nuevos') r = [...r].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === 'menor') r = [...r].sort((a, b) => price(a) - price(b));
    if (sort === 'mayor') r = [...r].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    // los que no tienen stock, al final
    return [...r].sort((a, b) => Number(a.availability === 'out') - Number(b.availability === 'out'));
  }, [products, cat, q, sort, onlyOffers]);

  const pick = (slug: string) => { setCat(slug); setLimit(24); };
  const top = useRef<HTMLDivElement>(null);

  // Permite elegir categoría desde los accesos de la portada o con ?categoria=… en la dirección
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('categoria');
    if (fromUrl && categories.some((c) => c.slug === fromUrl)) { setCat(fromUrl); requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth' })); }
    const onPick = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      setCat(slug); setOnlyOffers(false); setQ(''); setLimit(24);
      top.current?.scrollIntoView({ behavior: 'smooth' });
    };
    window.addEventListener('pick-category', onPick);
    return () => window.removeEventListener('pick-category', onPick);
  }, [categories]);

  return (
    <div ref={top} className="scroll-mt-24">
      <div className="sticky top-[60px] z-20 -mx-4 space-y-3 border-b border-white/10 bg-ink/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Buscar productos</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mist" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(24); }} type="search" placeholder="Buscar: pava, vajilla, auriculares…" className="w-full rounded-full border border-white/15 bg-steel py-3 pl-12 pr-10 text-white placeholder:text-mist/70 outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15" />
            {q && <button onClick={() => setQ('')} aria-label="Borrar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-mist hover:text-white"><X className="size-4" /></button>}
          </label>
          <label className="relative hidden sm:block">
            <span className="sr-only">Ordenar</span>
            <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mist" />
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-full appearance-none rounded-full border border-white/15 bg-steel py-3 pl-10 pr-6 text-sm font-semibold text-white outline-none focus:border-gold">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <Chip active={!cat && !onlyOffers} onClick={() => { pick(''); setOnlyOffers(false); }}>Todo</Chip>
          <Chip active={onlyOffers} onClick={() => setOnlyOffers((v) => !v)} hot>Ofertas</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={cat === c.slug} onClick={() => pick(cat === c.slug ? '' : c.slug)}>
              <CategoryIcon name={c.icon} className="size-4" /> {c.name}
            </Chip>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Ordenar" className="shrink-0 rounded-full border border-white/15 bg-steel px-4 text-sm font-semibold text-white sm:hidden">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <p className="mt-5 text-sm text-mist" aria-live="polite">{list.length} {list.length === 1 ? 'producto' : 'productos'}</p>
      {list.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-mist">
          No encontramos productos con esa búsqueda. Probá con otra palabra o consultanos por WhatsApp.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {list.slice(0, limit).map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
        </div>
      )}
      {list.length > limit && (
        <div className="mt-8 text-center">
          <button onClick={() => setLimit((l) => l + 24)} className="rounded-full border border-gold/60 px-8 py-3.5 font-bold text-gold transition hover:bg-gold hover:text-ink">
            Ver más productos ({list.length - limit})
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children, hot }: { active: boolean; onClick: () => void; children: React.ReactNode; hot?: boolean }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${active ? 'border-gold bg-gold text-ink' : hot ? 'border-red-500/50 text-red-300 hover:border-red-400' : 'border-white/15 text-white/80 hover:border-white/40 hover:text-white'}`}>
      {children}
    </button>
  );
}

export function CategoryTile({ slug, delay, children }: { slug: string; delay: number; children: React.ReactNode }) {
  return (
    <a
      href={`/?categoria=${slug}#catalogo`}
      onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('pick-category', { detail: slug })); }}
      className="reveal group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-coal p-4 text-center transition hover:-translate-y-1 hover:border-gold/60"
      style={{ ['--d' as string]: `${delay}ms` }}
    >
      {children}
    </a>
  );
}
