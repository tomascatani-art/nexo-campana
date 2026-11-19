'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Variant } from '@/lib/types';
import { inputCls } from './fields';

type Row = { key: string; id: string; name: string; sku: string; price: string; stock: string; active: boolean };
const SUGGEST = ['Color', 'Talle', 'Modelo', 'Tamaño', 'Voltaje'];

/** Variantes (talle, color, modelo…) con stock propio. Si no hay variantes, se usa el stock simple. */
export function VariantsEditor({ label, variants, stock, isNew }: { label: string | null; variants: Variant[]; stock: number | undefined; isNew: boolean }) {
  const [vl, setVl] = useState(label ?? '');
  const [on, setOn] = useState(!!label && variants.length > 0);
  const [rows, setRows] = useState<Row[]>(() =>
    variants.length
      ? variants.map((v) => ({ key: v.id, id: v.id, name: v.name, sku: v.sku ?? '', price: v.price == null ? '' : v.price.toLocaleString('es-AR'), stock: String(v.stock_qty), active: v.active }))
      : [{ key: 'n0', id: '', name: '', sku: '', price: '', stock: '', active: true }],
  );
  const upd = (i: number, k: keyof Row, v: string | boolean) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const total = rows.reduce((a, r) => a + (Number(r.stock) || 0), 0);

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300">
        <input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); if (e.target.checked && !vl) setVl('Color'); }} className="mt-0.5 size-6 shrink-0 accent-gold-deep" />
        <span><span className="block font-semibold text-gray-900">Tiene variantes (color, talle, modelo…)</span><span className="block text-sm text-gray-500">Cada opción tiene su propio stock y, si querés, su propio precio.</span></span>
      </label>
      <input type="hidden" name="variant_label" value={on ? vl : ''} />
      {!on ? (
        <label className="block">
          <span className="mb-1.5 block font-semibold text-gray-800">{isNew ? 'Unidades que tenés' : 'Stock actual'}</span>
          <input name="stock_qty" type="number" inputMode="numeric" min={0} defaultValue={stock ?? ''} className={inputCls} />
          {!isNew && <span className="mt-1.5 block text-sm text-gray-500">Si lo cambiás acá, queda registrado como “ajuste”. Para mercadería que entra, mejor usá Stock → Entrada.</span>}
        </label>
      ) : (
        <div className="space-y-3 rounded-xl bg-gray-50 p-4">
          <label className="block">
            <span className="mb-1.5 block font-semibold text-gray-800">¿Qué elige el cliente?</span>
            <input value={vl} onChange={(e) => setVl(e.target.value)} maxLength={30} className={inputCls} placeholder="Color" />
            <span className="mt-2 flex flex-wrap gap-1.5">{SUGGEST.map((s) => <button key={s} type="button" onClick={() => setVl(s)} className={`rounded-full border px-3 py-1 text-sm ${vl === s ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white'}`}>{s}</button>)}</span>
          </label>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.key} className={`grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border bg-white p-2.5 sm:grid-cols-[1fr_8rem_6rem_auto] ${r.active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'}`}>
                <input type="hidden" name="v_id" value={r.id} />
                <input type="hidden" name="v_sku" value={r.sku} />
                <input type="hidden" name="v_active" value={r.active ? '1' : '0'} />
                <input name="v_name" value={r.name} onChange={(e) => upd(i, 'name', e.target.value)} placeholder={vl === 'Talle' ? 'Ej: M' : vl === 'Color' ? 'Ej: Negro' : 'Opción'} aria-label="Nombre de la opción" className="col-span-3 min-w-0 rounded-lg sm:col-span-1 border border-gray-300 px-3 py-2.5 outline-none focus:border-gold-deep" />
                <input name="v_price" value={r.price} onChange={(e) => upd(i, 'price', e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="$ igual" aria-label="Precio propio (opcional)" className="min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-gold-deep" />
                <input name="v_stock" value={r.stock} onChange={(e) => upd(i, 'stock', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Stock" aria-label="Stock" className="min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-center outline-none focus:border-gold-deep" />
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => upd(i, 'active', !r.active)} title={r.active ? 'Ocultar opción' : 'Mostrar opción'} className={`rounded-lg px-2 py-2 text-xs font-bold ${r.active ? 'text-emerald-700' : 'text-gray-400'}`}>{r.active ? 'Visible' : 'Oculta'}</button>
                  <button type="button" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [{ ...rows[0], id: '', name: '', price: '', stock: '' }])} aria-label="Quitar opción" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setRows([...rows, { key: `n${Date.now()}`, id: '', name: '', sku: '', price: '', stock: '', active: true }])} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 font-semibold hover:border-gray-400"><Plus className="size-4" /> Agregar opción</button>
            <span className="text-sm text-gray-600">Stock total: <b>{total}</b></span>
          </div>
          <p className="text-sm text-gray-500">Precio vacío = usa el precio del producto. Al quitar una opción, se borra (si tiene ventas, mejor ocultala).</p>
        </div>
      )}
    </div>
  );
}
