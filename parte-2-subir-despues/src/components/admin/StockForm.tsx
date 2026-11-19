'use client';
import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck } from 'lucide-react';
import { stockMovementAction } from '@/app/admin/actions';
import { AdminForm, SubmitButton } from './ui';
import { inputCls } from './fields';

type P = { id: string; name: string; stock_qty: number; price: number | null; variants: { id: string; name: string; stock_qty: number }[] };

const KINDS = [
  ['entrada', 'Entrada', 'Llegó mercadería', ArrowDownToLine],
  ['venta', 'Venta / salida', 'Vendiste en el local', ArrowUpFromLine],
  ['ajuste', 'Conteo', 'Contaste y hay otro número', ClipboardCheck],
] as const;

export function StockForm({ products, initialId }: { products: P[]; initialId?: string }) {
  const [pid, setPid] = useState(initialId && products.some((p) => p.id === initialId) ? initialId : '');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('entrada');
  const [vid, setVid] = useState('');
  const p = products.find((x) => x.id === pid);
  const v = p?.variants.find((x) => x.id === vid);
  const current = v ? v.stock_qty : p?.stock_qty;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? products.filter((x) => x.name.toLowerCase().includes(t)).slice(0, 8) : [];
  }, [q, products]);

  return (
    <AdminForm action={stockMovementAction} resetOnSuccess className="space-y-4">
      <input type="hidden" name="product_id" value={pid} />
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-3 gap-2">
        {KINDS.map(([k, l, d, Icon]) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition ${kind === k ? 'border-gold-deep bg-gold/15' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <Icon className={`size-6 ${k === 'entrada' ? 'text-emerald-600' : k === 'venta' ? 'text-red-600' : 'text-blue-600'}`} />
            <span className="text-sm font-bold">{l}</span>
            <span className="hidden text-xs text-gray-500 sm:block">{d}</span>
          </button>
        ))}
      </div>
      {p ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <span><span className="block font-bold">{p.name}</span><span className="text-sm text-gray-500">Stock actual: <b>{current}</b></span></span>
          <button type="button" onClick={() => { setPid(''); setVid(''); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">Cambiar</button>
        </div>
      ) : (
        <div className="relative">
          <label className="block">
            <span className="mb-1.5 block font-semibold text-gray-800">Producto</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribí para buscar…" className={inputCls} />
          </label>
          {filtered.length > 0 && (
            <ul className="absolute inset-x-0 z-10 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              {filtered.map((x) => (
                <li key={x.id}><button type="button" onClick={() => { setPid(x.id); setQ(''); setVid(''); }} className="flex w-full justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"><span className="truncate">{x.name}</span><span className="shrink-0 text-sm text-gray-500">stock {x.stock_qty}</span></button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {p && p.variants.length > 0 && (
        <div>
          <span className="mb-1.5 block font-semibold text-gray-800">Opción</span>
          <input type="hidden" name="variant_id" value={vid} />
          <div className="flex flex-wrap gap-2">
            {p.variants.map((x) => <button key={x.id} type="button" onClick={() => setVid(x.id)} className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${vid === x.id ? 'border-gold-deep bg-gold/15' : 'border-gray-200 bg-white'}`}>{x.name} <span className="text-gray-500">({x.stock_qty})</span></button>)}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-semibold text-gray-800">{kind === 'ajuste' ? 'Stock real que contaste' : 'Cantidad'}</span>
          <input name="qty" type="number" inputMode="numeric" min={kind === 'ajuste' ? 0 : 1} required className={`${inputCls} text-lg font-bold`} />
        </label>
        {kind === 'venta' && (
          <label className="block">
            <span className="mb-1.5 block font-semibold text-gray-800">Precio de venta c/u</span>
            <input name="unit_price" inputMode="decimal" placeholder={p?.price != null ? `$ ${p.price.toLocaleString('es-AR')} (el de la web)` : '$'} className={inputCls} />
          </label>
        )}
        <label className={`block ${kind === 'venta' ? 'sm:col-span-2' : ''}`}>
          <span className="mb-1.5 block font-semibold text-gray-800">Nota (opcional)</span>
          <input name="note" maxLength={200} placeholder={kind === 'entrada' ? 'Ej: proveedor, remito N°…' : kind === 'venta' ? 'Ej: venta en mostrador' : 'Ej: inventario de fin de mes'} className={inputCls} />
        </label>
      </div>
      <SubmitButton className="w-full">{kind === 'entrada' ? 'Registrar entrada' : kind === 'venta' ? 'Registrar venta' : 'Corregir stock'}</SubmitButton>
    </AdminForm>
  );
}
