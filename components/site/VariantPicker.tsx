'use client';
import { useState } from 'react';
import type { PublicProduct } from '@/lib/types';
import { formatPrice } from '@/lib/pricing';
import { QtyStepper } from './ProductCard';

export function VariantPicker({ p }: { p: PublicProduct }) {
  const first = p.variants.find((v) => v.available);
  const [sel, setSel] = useState(first?.id ?? '');
  const v = p.variants.find((x) => x.id === sel);
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-semibold">{p.variant_label}: <span className="text-gold">{v?.name ?? 'elegí una opción'}</span></legend>
        <div className="flex flex-wrap gap-2">
          {p.variants.map((x) => (
            <button key={x.id} type="button" disabled={!x.available} onClick={() => setSel(x.id)} aria-pressed={sel === x.id}
              className={`relative rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${sel === x.id ? 'border-gold bg-gold/15 text-white' : 'border-white/15 text-white/80 hover:border-white/40'}`}>
              {x.name}{x.price != null && x.price !== p.price && <span className="ml-1.5 font-semibold text-gold">{formatPrice(x.price)}</span>}
            </button>
          ))}
        </div>
      </fieldset>
      {v && <QtyStepper key={v.id} id={p.id} v={v.id} max={v.max_qty} size="lg" />}
    </div>
  );
}
