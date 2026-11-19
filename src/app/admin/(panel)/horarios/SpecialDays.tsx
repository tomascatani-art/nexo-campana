'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { addHolidaysAction, deleteSpecialDayAction, saveSpecialDayAction } from '../../actions';
import { AdminForm, SubmitButton } from '@/components/admin/ui';
import { hoursText, specialDayLabel } from '@/lib/format';
import type { SpecialDay } from '@/lib/types';

const inp = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base tabular-nums outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30';

/** Feriados nacionales de fecha fija (y los de Semana Santa/Carnaval ya calculados). Los trasladables se cargan a mano. */
const NATIONAL: [string, string][] = [
  ['2026-12-08', 'Feriado: Inmaculada Concepción'], ['2026-12-25', 'Navidad'],
  ['2027-01-01', 'Año Nuevo'], ['2027-02-08', 'Carnaval'], ['2027-02-09', 'Carnaval'], ['2027-03-24', 'Día de la Memoria'],
  ['2027-03-26', 'Viernes Santo'], ['2027-04-02', 'Día de Malvinas'], ['2027-05-01', 'Día del Trabajador'], ['2027-05-25', 'Revolución de Mayo'],
  ['2027-06-20', 'Día de la Bandera'], ['2027-07-09', 'Día de la Independencia'], ['2027-12-08', 'Feriado: Inmaculada Concepción'], ['2027-12-25', 'Navidad'],
];

export function SpecialDays({ days, today }: { days: SpecialDay[]; today: string }) {
  const [kind, setKind] = useState<'cerrado' | 'abierto'>('cerrado');
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const have = new Set(days.map((d) => d.day));
  const limit = new Date(Date.parse(today) + 300 * 864e5).toISOString().slice(0, 10);
  const suggestions = NATIONAL.filter(([d]) => d >= today && d <= limit && !have.has(d));

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">Feriados y días especiales</h2>
      <p className="mb-4 text-sm text-gray-500">Para feriados, inventario, vacaciones u horario reducido. La web lo muestra en Horarios, avisa arriba en la página los 10 días previos y calcula “Abierto / Cerrado” con eso. Cuando la fecha pasa, desaparece sola.</p>

      {days.length > 0 && (
        <ul className="mb-5 space-y-2">
          {days.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${d.is_open ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800'}`}>{d.is_open ? 'HORARIO ESPECIAL' : 'CERRADO'}</span>
              <span className="min-w-0 flex-1"><b>{specialDayLabel(d.day)}</b> · {d.reason}{d.is_open && <span className="text-gray-500"> · {hoursText(d)}</span>}</span>
              <button type="button" disabled={pending} onClick={() => start(async () => { await deleteSpecialDayAction(d.id); router.refresh(); })} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Quitar ${specialDayLabel(d.day)}`}><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <AdminForm action={saveSpecialDayAction} resetOnSuccess className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 font-bold"><CalendarPlus className="size-5 text-gold-deep" /> Agregar un día</p>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <label className="text-sm font-semibold text-gray-700">Fecha<input type="date" name="day" min={today} required className={inp} /></label>
          <label className="text-sm font-semibold text-gray-700">Motivo<input name="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={80} placeholder="Ej: Feriado, Inventario, Vacaciones" className={inp} /></label>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Feriado', 'Inventario', 'Vacaciones', 'Fiesta patronal'].map((r) => <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border border-gray-300 px-3 py-1 text-sm font-semibold hover:border-gold-deep">{r}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(['cerrado', 'abierto'] as const).map((k) => (
            <label key={k} className={`cursor-pointer rounded-xl border-2 p-3 text-center font-semibold ${kind === k ? 'border-gold-deep bg-gold/15' : 'border-gray-200'}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {k === 'cerrado' ? 'Cerrado todo el día' : 'Abre con otro horario'}
            </label>
          ))}
        </div>
        {kind === 'abierto' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-sm text-gray-500">Abre<input type="time" name="open1" required className={inp} /></label>
            <label className="text-sm text-gray-500">Cierra<input type="time" name="close1" required className={inp} /></label>
            <label className="text-sm text-gray-500">Abre (tarde)<input type="time" name="open2" className={inp} /></label>
            <label className="text-sm text-gray-500">Cierra (tarde)<input type="time" name="close2" className={inp} /></label>
          </div>
        )}
        <SubmitButton className="w-full sm:w-auto">Guardar día especial</SubmitButton>
      </AdminForm>

      {suggestions.length > 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white p-5">
          <p className="font-bold">Feriados nacionales que vienen</p>
          <p className="mb-3 text-sm text-gray-500">Tocá los que cerrás para agregarlos. Los feriados que se trasladan (junio, agosto, octubre, noviembre) cambian cada año: cargalos arriba.</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 10).map(([d, r]) => (
              <button key={d} type="button" disabled={pending} onClick={() => start(async () => { await addHolidaysAction([{ day: d, reason: r }]); router.refresh(); })} className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm font-semibold hover:border-gold-deep hover:bg-gold/10">+ {specialDayLabel(d)} · {r.replace('Feriado: ', '')}</button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
