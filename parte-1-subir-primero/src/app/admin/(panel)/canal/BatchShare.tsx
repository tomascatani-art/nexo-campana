'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { ShareKit } from '@/components/admin/ShareKit';
import { buildBatchText, buildComboText, type ShareProductData } from '@/lib/share-text';
import { formatPrice } from '@/lib/pricing';
import { timeAgo } from '@/lib/format';

type P = ShareProductData & { image_id: string | null; shared_at: string | null; created_at: string };

export function BatchShare({ products, business, footer, channelUrl, site }: { products: P[]; business: string; footer: string | null; channelUrl: string | null; site: string }) {
  const [sel, setSel] = useState<string[]>(() => products.filter((p) => !p.shared_at).slice(0, 10).map((p) => p.id));
  const chosen = useMemo(() => products.filter((p) => sel.includes(p.id)), [products, sel]);
  const [mode, setMode] = useState<'novedades' | 'combo'>('novedades');
  const [combo, setCombo] = useState('');
  const comboPrice = combo.trim() ? Number(combo.replace(/\./g, '').replace(',', '.')) : null;
  const text = mode === 'combo' ? buildComboText(chosen, Number.isFinite(comboPrice) ? comboPrice : null, site) : buildBatchText(chosen, site, business, footer);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 10 ? s : [...s, id]));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <section>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">{sel.length} elegidos <span className="font-normal text-gray-500">(máx. 10 por publicación)</span></span>
          <span className="flex gap-3">
            <button type="button" onClick={() => setSel(products.filter((p) => !p.shared_at).slice(0, 10).map((p) => p.id))} className="font-semibold text-gold-deep hover:underline">Sin compartir</button>
            <button type="button" onClick={() => setSel([])} className="font-semibold text-gray-500 hover:underline">Ninguno</button>
          </span>
        </div>
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {products.map((p) => {
            const on = sel.includes(p.id);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => toggle(p.id)} aria-pressed={on} className={`flex w-full items-center gap-3 rounded-xl border bg-white p-2.5 text-left transition ${on ? 'border-gold-deep ring-2 ring-gold/40' : 'border-gray-200 hover:border-gray-300'}`}>
                  {on ? <CheckCircle2 className="size-6 shrink-0 text-gold-deep" /> : <Circle className="size-6 shrink-0 text-gray-300" />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_id ? <img src={`/img/${p.image_id}`} alt="" className="size-12 rounded-lg object-cover" /> : <span className="size-12 rounded-lg bg-gray-100" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="text-sm text-gray-500">{formatPrice(p.price) ?? 'Sin precio'} · {p.shared_at ? `compartido ${timeAgo(p.shared_at)}` : <b className="text-emerald-700">sin compartir</b>}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="lg:sticky lg:top-6 lg:self-start">
        {chosen.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">Elegí uno o más productos de la lista.</p>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de publicación">
                {([['novedades', 'Novedades (varios productos)'], ['combo', 'Combo con precio especial']] as const).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${mode === v ? 'border-gold-deep bg-gold text-ink' : 'border-gray-300 bg-white'}`}>{l}</button>
                ))}
              </div>
              {mode === 'combo' && (
                <label className="mt-3 block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">Precio del combo</span>
                  <span className="relative block max-w-xs"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input value={combo} onChange={(e) => setCombo(e.target.value)} inputMode="decimal" placeholder={String(chosen.reduce((a, p) => a + (p.price ?? 0), 0))} className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-7 pr-3 outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30" />
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">Elegí 2 o 3 productos de la lista. El texto muestra cuánto ahorran.</span>
                </label>
              )}
            </div>
            <ShareKit products={chosen} initialText={text} channelUrl={channelUrl} siteUrl={site} />
          </>
        )}
      </section>
    </div>
  );
}
