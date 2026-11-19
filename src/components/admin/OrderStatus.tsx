'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { saveOrderNoteAction, setOrderStatusAction } from '@/app/admin/actions';
import { Flash } from './ui';

export const STATUS_UI: Record<string, { label: string; cls: string; next?: string; nextLabel?: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800', next: 'confirmado', nextLabel: 'Confirmar pedido' },
  confirmado: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-800', next: 'preparando', nextLabel: 'Marcar “Preparando”' },
  preparando: { label: 'Preparando', cls: 'bg-violet-100 text-violet-800', next: 'enviado', nextLabel: 'Marcar “Enviado / listo para retirar”' },
  enviado: { label: 'Enviado / listo', cls: 'bg-cyan-100 text-cyan-800', next: 'entregado', nextLabel: 'Marcar “Entregado”' },
  entregado: { label: 'Entregado', cls: 'bg-emerald-100 text-emerald-800' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-200 text-gray-600' },
};
const FLOW = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado'];

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_UI[status] ?? STATUS_UI.pendiente;
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

export function StatusControls({ id, status, stockApplied }: { id: string; status: string; stockApplied: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const router = useRouter();
  const go = (next: string) => start(async () => {
    setErr(null);
    const r = await setOrderStatusAction(id, next);
    if (r.ok) { setMsg(r.message ?? 'Listo'); setConfirmCancel(false); router.refresh(); } else setErr(r.error ?? 'Error');
  });
  const cur = STATUS_UI[status];
  const idx = FLOW.indexOf(status);
  return (
    <div className="space-y-4">
      {msg && <Flash message={msg} />}
      <ol className="flex items-center gap-1" aria-label="Estado del pedido">
        {FLOW.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${status === 'cancelado' ? 'bg-gray-100 text-gray-400' : i <= idx ? 'bg-gold text-ink' : 'bg-gray-100 text-gray-400'}`}>{i < idx ? <Check className="size-4" /> : i + 1}</span>
            <span className={`text-[11px] font-semibold leading-tight ${i === idx ? 'text-gray-900' : 'text-gray-400'}`}>{STATUS_UI[s].label}</span>
          </li>
        ))}
      </ol>
      {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{err}</p>}
      {cur?.next && (
        <button onClick={() => go(cur.next!)} disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-4 text-lg font-bold text-ink hover:bg-gold-deep disabled:opacity-60">
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />} {cur.nextLabel}
        </button>
      )}
      {status === 'pendiente' && <p className="text-center text-sm text-gray-500">Al confirmar se descuenta el stock de los productos.</p>}
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Cambiar a:
          <select value="" onChange={(e) => e.target.value && go(e.target.value)} disabled={pending} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5">
            <option value="">elegí…</option>
            {FLOW.filter((s) => s !== status).map((s) => <option key={s} value={s}>{STATUS_UI[s].label}</option>)}
          </select>
        </label>
        {status !== 'cancelado' && (confirmCancel ? (
          <span className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm">
            ¿Cancelar?{stockApplied && ' El stock vuelve.'}
            <button onClick={() => setConfirmCancel(false)} className="font-semibold text-gray-600">No</button>
            <button onClick={() => go('cancelado')} className="font-bold text-red-700">Sí, cancelar</button>
          </span>
        ) : (
          <button onClick={() => setConfirmCancel(true)} className="ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">Cancelar pedido</button>
        ))}
      </div>
    </div>
  );
}

export function OrderNote({ id, note, paid }: { id: string; note: string | null; paid: boolean }) {
  const [v, setV] = useState(note ?? '');
  const [p, setP] = useState(paid);
  const [state, setState] = useState<'idle' | 'saving' | 'ok'>('idle');
  const save = async (nv = v, np = p) => { setState('saving'); await saveOrderNoteAction(id, nv, np); setState('ok'); setTimeout(() => setState('idle'), 2000); };
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
        <input type="checkbox" checked={p} onChange={(e) => { setP(e.target.checked); save(v, e.target.checked); }} className="size-6 accent-gold-deep" />
        <span className="font-semibold">Pago recibido</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-gray-700">Nota interna (solo la ves vos)</span>
        <textarea value={v} onChange={(e) => setV(e.target.value)} onBlur={() => save()} rows={2} className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-gold-deep" placeholder="Ej: pasa a retirar el sábado" />
      </label>
      {state !== 'idle' && <p className="text-sm text-gray-500">{state === 'saving' ? 'Guardando…' : 'Guardado ✓'}</p>}
    </div>
  );
}
