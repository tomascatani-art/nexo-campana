'use client';
import { useState, useTransition } from 'react';
import { Check, DollarSign, Loader2 } from 'lucide-react';
import { setUsdRateAction } from '@/app/admin/actions';
import { timeAgo } from '@/lib/format';

/** Cotización del dólar del día, editable desde el tablero en un toque. */
export function UsdRate({ rate, at }: { rate: number | null; at: string | null }) {
  const [v, setV] = useState(rate == null ? '' : rate.toLocaleString('es-AR'));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const old = at && new Date(at).toDateString() !== new Date().toDateString();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await setUsdRateAction(v); setMsg(r.ok ? 'Guardada ✓' : r.error ?? 'Error'); }); }} className={`mb-5 flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm ${old || rate == null ? 'border-amber-300' : 'border-gray-200'}`} data-testid="usd-rate">
      <span className="flex items-center gap-2 font-bold"><DollarSign className="size-5 text-emerald-600" /> Dólar de hoy</span>
      <span className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-gray-500">$</span><input value={v} onChange={(e) => { setV(e.target.value); setMsg(null); }} inputMode="decimal" placeholder="Ej: 1.450" className="w-32 rounded-xl border border-gray-300 py-2.5 pl-7 pr-3 text-lg font-bold outline-none focus:border-gold-deep" aria-label="Cotización del dólar" /></span>
      <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar</button>
      <span className="text-sm text-gray-500">{msg ?? (rate == null ? 'Sin cargar: la web no muestra precios en dólares.' : old ? `⚠️ Es de ${timeAgo(at!)}: actualizala.` : `Actualizada ${timeAgo(at!)}.`)}</span>
    </form>
  );
}
