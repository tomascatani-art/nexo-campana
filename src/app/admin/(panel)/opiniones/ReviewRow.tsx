'use client';
import { useTransition } from 'react';
import { reviewAction } from '@/app/admin/actions';
import type { Review } from '@/lib/types';

const TAG: Record<Review['status'], string> = { pendiente: 'bg-amber-100 text-amber-800', publicada: 'bg-emerald-100 text-emerald-800', oculta: 'bg-gray-100 text-gray-600' };

export function ReviewRow({ r, ago }: { r: Review; ago: string }) {
  const [busy, start] = useTransition();
  const run = (op: 'publicada' | 'oculta' | 'borrar') => start(async () => { await reviewAction(r.id, op); });
  return (
    <li className={`rounded-2xl border bg-white p-4 shadow-sm ${r.status === 'pendiente' ? 'border-amber-300' : 'border-gray-200'} ${busy ? 'opacity-50' : ''}`} data-testid="review-row">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg text-amber-500" aria-label={`${r.rating} de 5`}>{'★'.repeat(r.rating)}<span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span></span>
        <b>{r.name}</b>
        <span className="text-sm text-gray-500">{ago}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${TAG[r.status]}`}>{r.status}</span>
      </div>
      <p className="mt-2 whitespace-pre-line text-gray-800">{r.text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {r.status !== 'publicada' && <button type="button" disabled={busy} onClick={() => run('publicada')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Publicar</button>}
        {r.status !== 'oculta' && <button type="button" disabled={busy} onClick={() => run('oculta')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Ocultar</button>}
        <button type="button" disabled={busy} onClick={() => { if (confirm('¿Borrar esta opinión?')) run('borrar'); }} className="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Borrar</button>
      </div>
    </li>
  );
}
