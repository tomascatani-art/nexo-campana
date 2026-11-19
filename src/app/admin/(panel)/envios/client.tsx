'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Trash2 } from 'lucide-react';
import { waitlistAction } from '../../actions';
import { WhatsAppIcon } from '@/components/icons';
import type { ShippingZone, WaitlistEntry } from '@/lib/types';

const inp = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30';

export function ZonesEditor({ zones }: { zones: ShippingZone[] }) {
  const [rows, setRows] = useState(zones.length ? zones.map((z, i) => ({ k: i, ...z })) : []);
  const [n, setN] = useState(zones.length);
  return (
    <div>
      <p className="mb-1.5 font-semibold text-gray-800">Zonas (opcional)</p>
      {rows.length > 0 && (
        <ul className="mb-2 space-y-2">
          {rows.map((r) => (
            <li key={r.k} className="flex items-center gap-2">
              <input name="z_name" defaultValue={r.name} placeholder="Ej: Campana centro" maxLength={60} className={inp} aria-label="Zona" />
              <div className="relative w-40 shrink-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input name="z_cost" defaultValue={r.cost ?? ''} inputMode="decimal" placeholder="a convenir" className={`${inp} pl-7`} aria-label="Costo" />
              </div>
              <button type="button" onClick={() => setRows(rows.filter((x) => x.k !== r.k))} className="rounded-lg p-2.5 text-red-600 hover:bg-red-50" aria-label="Quitar zona"><Trash2 className="size-5" /></button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => { setRows([...rows, { k: n, name: '', cost: null }]); setN(n + 1); }} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:border-gold-deep"><Plus className="size-4" /> Agregar zona</button>
      <p className="mt-1.5 text-sm text-gray-500">Si cargás zonas, el cliente elige la suya y se usa ese precio (vacío = a convenir).</p>
    </div>
  );
}

export function WaitlistRow({ w, ago, message }: { w: WaitlistEntry; ago: string; message: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const digits = w.phone.replace(/\D/g, '');
  const intl = digits.startsWith('54') ? digits : `549${digits.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1')}`;
  const act = (op: 'avisado' | 'borrar') => start(async () => { await waitlistAction(w.id, op); router.refresh(); });
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 ${w.notified_at ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{w.name || 'Sin nombre'} <span className="font-normal text-gray-500">· {w.phone}</span></p>
        <p className="text-sm text-gray-500">Se anotó {ago}{w.notified_at ? ' · ya avisado ✓' : ''}</p>
      </div>
      <a href={`https://wa.me/${intl}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" onClick={() => !w.notified_at && act('avisado')} className="inline-flex items-center gap-2 rounded-lg bg-[#25d366] px-3 py-2 text-sm font-bold text-white hover:bg-[#1da851]"><WhatsAppIcon className="size-4" /> Avisar</a>
      {!w.notified_at && <button type="button" disabled={pending} onClick={() => act('avisado')} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"><Check className="size-4" /> Marcar avisado</button>}
      <button type="button" disabled={pending} onClick={() => act('borrar')} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Borrar ${w.name || w.phone}`}><Trash2 className="size-4" /></button>
    </li>
  );
}
