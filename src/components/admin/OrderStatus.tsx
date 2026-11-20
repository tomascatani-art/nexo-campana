'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { extendOrderAction, markNoShowAction, removeNoShowAction, saveOrderNoteAction, setOrderStatusAction } from '@/app/admin/actions';
import { Flash } from './ui';

export const STATUS_UI: Record<string, { label: string; cls: string; next?: string; nextLabel?: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800', next: 'confirmado', nextLabel: 'Confirmar pedido' },
  confirmado: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-800', next: 'preparando', nextLabel: 'Marcar “Preparando”' },
  preparando: { label: 'Preparando', cls: 'bg-violet-100 text-violet-800', next: 'enviado', nextLabel: 'Marcar “Enviado / listo para retirar”' },
  enviado: { label: 'Enviado / listo', cls: 'bg-cyan-100 text-cyan-800', next: 'entregado', nextLabel: 'Marcar “Entregado”' },
  entregado: { label: 'Entregado', cls: 'bg-emerald-100 text-emerald-800' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-200 text-gray-600' },
  vencido: { label: 'Vencido', cls: 'bg-red-100 text-red-700' },
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
            <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${status === 'cancelado' || status === 'vencido' ? 'bg-gray-100 text-gray-400' : i <= idx ? 'bg-gold text-ink' : 'bg-gray-100 text-gray-400'}`}>{i < idx ? <Check className="size-4" /> : i + 1}</span>
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
        {status !== 'cancelado' && status !== 'vencido' && (confirmCancel ? (
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

/** Retiro en el local: hasta cuándo se guarda, dar más tiempo, "No lo retiró" y aviso de seña. */
export function PickupControls({ id, status, deadline, left, noShow, flaggedTimes, needsDeposit, depositPct, phone }: {
  id: string; status: string; deadline: string | null; left: string | null; noShow: boolean; flaggedTimes: number; needsDeposit: boolean; depositPct: number; phone: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    setErr(null);
    const r = await fn();
    if (r.ok) { setMsg(r.message ?? 'Listo'); setConfirm(false); router.refresh(); } else setErr(r.error ?? 'Error');
  });
  const active = ['pendiente', 'confirmado', 'preparando', 'enviado'].includes(status);
  return (
    <div className="space-y-3">
      {msg && <Flash message={msg} />}
      {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{err}</p>}
      {flaggedTimes > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" data-testid="noshow-banner">
          <p className="font-bold">⚠️ Este cliente ya dejó {flaggedTimes === 1 ? 'un pedido' : `${flaggedTimes} pedidos`} sin retirar.</p>
          <p className="mt-0.5">{needsDeposit ? `Se le avisó que tiene que dejar una seña del ${depositPct}%.` : `Pedile una seña del ${depositPct}% antes de prepararlo.`} Si ya cumplió, sacalo de la lista.</p>
          <button onClick={() => run(() => removeNoShowAction(phone))} disabled={pending} className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100">Sacar de la lista</button>
        </div>
      )}
      {active ? (
        <p className="text-gray-700">⏳ {deadline ? <>Se guarda hasta el <b>{deadline}</b>{left ? ` (${left})` : ''}. Si no lo retira, pasa solo a “Vencido” y el stock vuelve.</> : 'Este pedido no tiene vencimiento.'}</p>
      ) : status === 'vencido' ? (
        <p className="text-gray-700">Este pedido venció porque no lo retiraron a tiempo. Si el cliente igual lo quiere, dale más tiempo y vuelve a “Pendiente”.</p>
      ) : null}
      {(active || status === 'vencido') && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => run(() => extendOrderAction(id, 24))} disabled={pending} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-semibold hover:border-gold-deep disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" /> : '⏳'} Darle 24 h más
          </button>
          {!noShow && (confirm ? (
            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm">
              ¿No lo retiró? {active ? 'El pedido vence, ' : ''}lo anotamos en “No retiraron” y la próxima le pedimos seña.
              <button onClick={() => setConfirm(false)} className="font-semibold text-gray-600">No</button>
              <button onClick={() => run(() => markNoShowAction(id))} className="font-bold text-red-700">Sí, no lo retiró</button>
            </span>
          ) : (
            <button onClick={() => setConfirm(true)} disabled={pending} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50">🚫 No lo retiró</button>
          ))}
        </div>
      )}
      {noShow && <p className="text-sm font-semibold text-red-700">🚫 Marcado como “No lo retiró”.</p>}
    </div>
  );
}
