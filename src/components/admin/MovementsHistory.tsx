'use client';
import { useState } from 'react';
import Link from 'next/link';

export type MoveRow = { id: number; ago: string; product: string; variant: string | null; kind: string; qty: number; detail: string };

const KINDS: [string, string][] = [['', 'Todos'], ['entrada', 'Entradas'], ['venta', 'Ventas'], ['ajuste', 'Ajustes'], ['devolucion', 'Devoluciones']];
const LABEL: Record<string, string> = { entrada: 'Entrada', venta: 'Venta', ajuste: 'Ajuste', devolucion: 'Devolución' };

/** Historial con filtros instantáneos: los botones filtran en el celular, sin volver a pedir la página. */
export function MovementsHistory({ moves, initialKind = '', filteredByProduct = false }: { moves: MoveRow[]; initialKind?: string; filteredByProduct?: boolean }) {
  const [kind, setKind] = useState(initialKind);
  const [show, setShow] = useState(60);
  const list = kind ? moves.filter((m) => m.kind === kind) : moves;
  return (
    <section id="movimientos" className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
        <h2 className="text-lg font-bold">Historial de movimientos{filteredByProduct && <Link href="/admin/stock#movimientos" className="ml-2 text-sm font-semibold text-gold-deep">(ver todos)</Link>}</h2>
        <div className="no-scrollbar flex gap-1 overflow-x-auto text-sm font-semibold">
          {KINDS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setKind(v); setShow(60); }} aria-pressed={kind === v} className={`shrink-0 rounded-full border px-3 py-1.5 transition active:scale-95 ${kind === v ? 'border-ink bg-ink text-white' : 'border-gray-300'}`}>{l}</button>
          ))}
        </div>
      </div>
      {list.length === 0 ? <p className="p-6 text-center text-gray-500">Sin movimientos.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-2.5">Cuándo</th><th className="px-4 py-2.5">Producto</th><th className="px-4 py-2.5">Tipo</th><th className="px-4 py-2.5 text-right">Cant.</th><th className="hidden px-4 py-2.5 sm:table-cell">Detalle</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {list.slice(0, show).map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{m.ago}</td>
                  <td className="max-w-[12rem] truncate px-4 py-2.5 font-medium">{m.product}{m.variant && <span className="text-gray-500"> · {m.variant}</span>}</td>
                  <td className="px-4 py-2.5">{LABEL[m.kind] ?? m.kind}</td>
                  <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${m.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                  <td className="hidden px-4 py-2.5 text-gray-500 sm:table-cell">{m.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > show && <div className="p-4 text-center"><button type="button" onClick={() => setShow((n) => n + 60)} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold">Ver más</button></div>}
        </div>
      )}
    </section>
  );
}
