'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ImageOff, Minus, Plus } from 'lucide-react';
import type { PublicProduct } from '@/lib/types';
import { discountPct, formatPrice } from '@/lib/pricing';
import { useList } from './ListProvider';

export function Badges({ p, className = '' }: { p: PublicProduct; className?: string }) {
  const off = discountPct(p.price, p.old_price);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {off && <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow">-{off}%</span>}
      {p.is_new && <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-ink shadow">Nuevo</span>}
      {p.best_seller && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gold shadow">Más vendido</span>}
    </div>
  );
}

export function QtyStepper({ id, v, size = 'md', max }: { id: string; v?: string; size?: 'md' | 'lg'; max: number | null }) {
  const { qtyOf, set: setQ, add: addQ } = useList();
  const q = qtyOf(id, v);
  const set = (_: string, n: number) => setQ(id, n, v);
  const add = () => addQ(id, 1, v);
  const big = size === 'lg';
  if (q === 0) {
    return (
      <button onClick={() => add()} className={`btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink transition hover:bg-gold-soft active:scale-[.97] ${big ? 'py-4 text-lg' : 'py-2.5 text-sm'}`}>
        <Plus className={big ? 'size-5' : 'size-4'} /> Agregar al carrito
      </button>
    );
  }
  const atMax = max != null && q >= max;
  return (
    <div className={`flex w-full items-center justify-between rounded-xl border-2 border-gold bg-gold/10 ${big ? 'p-1.5' : 'p-1'}`}>
      <button onClick={() => set(id, q - 1)} aria-label="Quitar uno" className={`flex items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 active:scale-90 ${big ? 'size-12' : 'size-9'}`}><Minus className="size-4" /></button>
      <label className="flex flex-col items-center">
        <span className="sr-only">Cantidad</span>
        <input
          value={q}
          inputMode="numeric"
          onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); if (n >= 0) set(id, n); }}
          onFocus={(e) => e.currentTarget.select()}
          className={`w-14 bg-transparent text-center font-black tabular-nums text-white outline-none ${big ? 'text-2xl' : 'text-lg'}`}
        />
        <span className="-mt-1 flex items-center gap-1 text-[10px] font-bold uppercase text-gold"><Check className="size-3" /> en el carrito</span>
      </label>
      <button onClick={() => add()} disabled={atMax} aria-label="Sumar uno" className={`flex items-center justify-center rounded-lg bg-gold text-ink transition hover:bg-gold-soft active:scale-90 disabled:opacity-30 ${big ? 'size-12' : 'size-9'}`}><Plus className="size-4" /></button>
    </div>
  );
}

export function ProductCard({ p, priority }: { p: PublicProduct; priority?: boolean }) {
  const out = p.availability === 'out';
  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-coal transition duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-2xl hover:shadow-gold/10 ${out ? 'opacity-70' : ''}`}>
      <Link href={`/producto/${p.slug}`} className="skeleton-light relative block aspect-square overflow-hidden">
        {p.image_id ? (
          <Image src={`/img/${p.image_id}`} alt={p.name} fill sizes="(min-width:1280px) 280px, (min-width:768px) 30vw, 50vw" className={`object-cover transition duration-700 group-hover:scale-105 ${out ? 'grayscale' : ''}`} priority={priority} />
        ) : (
          <span className="flex size-full items-center justify-center text-gray-300"><ImageOff className="size-10" /></span>
        )}
        <Badges p={p} className="absolute left-2.5 top-2.5" />
        {out && <span className="absolute inset-x-0 bottom-0 bg-ink/85 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-white">Sin stock</span>}
        {p.availability === 'low' && <span className="absolute inset-x-0 bottom-0 bg-red-600/90 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-white">¡Últimas unidades!</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {p.category_name && <p className="text-[11px] font-bold uppercase tracking-widest text-gold/80">{p.category_name}</p>}
        <h3 className="mt-1 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug text-white">
          <Link href={`/producto/${p.slug}`} className="hover:text-gold">{p.name}</Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          {p.price != null ? (
            <>
              <span className="font-display text-xl font-black text-white sm:text-2xl">{formatPrice(p.price)}</span>
              {p.unit_label && <span className="text-xs text-mist">{p.unit_label}</span>}
              {p.old_price != null && <span className="w-full text-sm text-mist line-through">{formatPrice(p.old_price)}</span>}
            </>
          ) : (
            <span className="font-display text-lg font-bold text-gold">Consultar precio</span>
          )}
        </div>
        {p.bulk_qty && p.bulk_price != null && (
          <p className="mt-2 rounded-lg bg-gold/10 px-2.5 py-1.5 text-xs font-semibold text-gold">
            Llevando {p.bulk_qty}+: <span className="font-black">{formatPrice(p.bulk_price)}</span> c/u
          </p>
        )}
        <div className="mt-auto pt-3">
          {out ? (
            <p className="rounded-xl border border-white/10 py-2.5 text-center text-sm font-semibold text-mist">Sin stock por ahora</p>
          ) : p.variants.length ? (
            <Link href={`/producto/${p.slug}`} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gold py-2 text-sm font-bold text-gold transition hover:bg-gold hover:text-ink">
              Elegir {p.variant_label?.toLowerCase()} <span className="text-xs font-semibold opacity-70">({p.variants.length})</span>
            </Link>
          ) : (
            <QtyStepper id={p.id} max={p.max_qty} />
          )}
        </div>
      </div>
    </article>
  );
}
