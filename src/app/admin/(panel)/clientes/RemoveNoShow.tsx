'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeNoShowAction } from '@/app/admin/actions';

/** Saca a un cliente de la lista "No retiraron" (con confirmación). */
export function RemoveNoShow({ phone }: { phone: string }) {
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!ask) return <button onClick={() => setAsk(true)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Sacar de la lista</button>;
  return (
    <span className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm">
      ¿Sacarlo?
      <button onClick={() => setAsk(false)} className="font-semibold text-gray-600">No</button>
      <button disabled={pending} onClick={() => start(async () => { await removeNoShowAction(phone); router.refresh(); })} className="font-bold text-red-700">{pending ? '…' : 'Sí'}</button>
    </span>
  );
}
