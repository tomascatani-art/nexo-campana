'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, CircleCheck, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { importProductsAction, type ImportRow } from '@/app/admin/actions';
import { formatPrice } from '@/lib/pricing';

type Existing = { id: string; sku: string | null; name: string; price: number | null; stock_qty: number };
type Cell = string | number | boolean | Date | null | undefined;

const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Nombres de columna que reconocemos (también los del "Exportar" del panel)
const COLS: Record<keyof ImportRow | 'variant', string[]> = {
  sku: ['codigo', 'cod', 'sku', 'codigo interno', 'articulo'],
  name: ['producto', 'nombre', 'descripcion corta', 'item'],
  category: ['categoria', 'rubro', 'seccion'],
  price: ['precio', 'precio venta', 'precio de venta', 'pvp', 'precio unitario'],
  old_price: ['precio anterior', 'precio tachado', 'antes'],
  cost: ['costo', 'precio costo', 'precio de costo'],
  stock: ['stock', 'cantidad', 'unidades', 'existencia'],
  description: ['descripcion', 'detalle', 'caracteristicas'],
  variant: ['variante'],
};

function toNumber(v: Cell): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[$\s]/g, '');
  if (!s) return null;
  // "45.000,50" (argentino) o "45000.50"
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"' && cur === '') q = true; // solo abre comillas al empezar el campo (ej: TV 32" no rompe)
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

type Parsed = { row: ImportRow; line: number; match: Existing | null; error: string | null };

export function Importer({ existing }: { existing: Existing[] }) {
  const [rows, setRows] = useState<Parsed[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [file, setFile] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publish, setPublish] = useState(false);
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function load(f: File | undefined) {
    if (!f) return;
    setErr(null); setRows(null); setDone(null); setFile(f.name);
    try {
      let table: Cell[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        table = (await readSheet(f)) as Cell[][];
      } else if (/\.(csv|txt)$/i.test(f.name)) {
        table = parseCsv((await f.text()).replace(/^﻿/, ''));
      } else throw new Error('Subí un archivo de Excel (.xlsx) o .csv. Si es .xls viejo, abrilo en Excel y “Guardar como” .xlsx.');
      const hi = table.findIndex((r) => r.some((c) => COLS.name.includes(norm(c))));
      if (hi < 0) throw new Error('No encontramos la columna “Producto”. Usá la planilla modelo o poné ese título en la primera fila.');
      const head = table[hi].map(norm);
      const idx = Object.fromEntries(Object.entries(COLS).map(([k, names]) => [k, head.findIndex((h) => names.includes(h))])) as Record<keyof typeof COLS, number>;
      const get = (r: Cell[], k: keyof typeof COLS) => (idx[k] >= 0 ? r[idx[k]] : null);
      const str = (v: Cell) => { const s = v instanceof Date ? v.toLocaleDateString('es-AR') : String(v ?? '').trim(); return s || null; };
      const bySku = new Map(existing.filter((e) => e.sku).map((e) => [e.sku!.toLowerCase(), e]));
      const byName = new Map(existing.map((e) => [e.name.toLowerCase(), e]));
      let skip = 0;
      const out: Parsed[] = [];
      table.slice(hi + 1).forEach((r, i) => {
        const name = str(get(r, 'name'));
        if (!name) return;
        if (str(get(r, 'variant'))) { skip++; return; } // las variantes se editan en cada producto
        const nums = { price: toNumber(get(r, 'price')), old_price: toNumber(get(r, 'old_price')), cost: toNumber(get(r, 'cost')), stock: toNumber(get(r, 'stock')) };
        const bad = Object.entries(nums).find(([, v]) => v != null && (Number.isNaN(v) || v < 0));
        const row: ImportRow = {
          sku: str(get(r, 'sku'))?.slice(0, 60) ?? null, name: name.slice(0, 120), category: str(get(r, 'category'))?.slice(0, 60) ?? null,
          price: bad ? null : nums.price, old_price: bad ? null : nums.old_price, cost: bad ? null : nums.cost,
          stock: bad || nums.stock == null ? null : Math.round(nums.stock), description: str(get(r, 'description'))?.slice(0, 1500) ?? null,
        };
        const match = (row.sku && bySku.get(row.sku.toLowerCase())) || byName.get(row.name.toLowerCase()) || null;
        out.push({ row, line: hi + i + 2, match, error: bad ? `“${bad[0] === 'stock' ? 'Stock' : 'Precio'}” no es un número` : null });
      });
      if (!out.length) throw new Error('La planilla no tiene productos debajo de los títulos.');
      setRows(out); setSkipped(skip);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No pudimos leer el archivo.');
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  async function save() {
    if (!rows) return;
    setBusy(true); setErr(null);
    const r = await importProductsAction(rows.filter((x) => !x.error).map((x) => x.row), publish).catch(() => ({ ok: false as const, error: 'Sin conexión. Probá de nuevo.' }));
    setBusy(false);
    if (r.ok) { setDone({ created: r.created, updated: r.updated }); setRows(null); } else setErr(r.error);
  }

  const news = rows?.filter((r) => !r.match && !r.error).length ?? 0;
  const upd = rows?.filter((r) => r.match && !r.error).length ?? 0;
  const bad = rows?.filter((r) => r.error).length ?? 0;

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-gray-600 hover:border-gold-deep hover:text-gold-deep">
        <FileSpreadsheet className="size-10" />
        <span className="text-lg font-bold">{file && rows ? `Archivo: ${file} (tocá para cambiar)` : 'Elegir planilla de Excel o CSV'}</span>
        <span className="text-sm">.xlsx o .csv</span>
      </button>
      <input ref={input} type="file" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={(e) => load(e.target.files?.[0])} data-testid="import-file" />
      {err && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-4 font-medium text-red-700"><CircleAlert className="mt-0.5 size-5 shrink-0" /> {err}</p>}
      {done && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CircleCheck className="size-5" /> Listo: {done.created} productos nuevos y {done.updated} actualizados. <Link href="/admin/productos" className="underline">Ver productos</Link></p>}
      {rows && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">{news} nuevos</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">{upd} se actualizan</span>
            {bad > 0 && <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{bad} con errores (se saltean)</span>}
            {skipped > 0 && <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">{skipped} filas de variantes (se editan en cada producto)</span>}
          </div>
          <div className="mt-4 max-h-[55vh] overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-2">Fila</th><th className="p-2">Producto</th><th className="p-2">Precio</th><th className="p-2">Stock</th><th className="p-2">Categoría</th><th className="p-2">Qué pasa</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.line} className={r.error ? 'bg-red-50' : ''} data-testid="import-row">
                    <td className="p-2 text-gray-400">{r.line}</td>
                    <td className="p-2 font-semibold">{r.match ? r.match.name : r.row.name}{r.row.sku && <span className="block text-xs font-normal text-gray-500">{r.row.sku}</span>}</td>
                    <td className="p-2 tabular-nums">{r.row.price != null ? <>{r.match?.price != null && r.match.price !== r.row.price && <span className="mr-1 text-gray-400 line-through">{formatPrice(r.match.price)}</span>}{formatPrice(r.row.price)}</> : '—'}</td>
                    <td className="p-2 tabular-nums">{r.row.stock ?? '—'}{r.match && r.row.stock != null && r.row.stock !== r.match.stock_qty && <span className="ml-1 text-xs text-gray-400">(antes {r.match.stock_qty})</span>}</td>
                    <td className="p-2">{r.row.category ?? '—'}</td>
                    <td className="p-2 font-semibold">{r.error ? <span className="text-red-600">{r.error}</span> : r.match ? <span className="text-sky-700">Actualiza</span> : <span className="text-emerald-700">Nuevo</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {news > 0 && (
            <label className="mt-4 flex items-start gap-3">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="mt-1 size-5 accent-gold-deep" />
              <span><b>Publicar ya los productos nuevos</b><span className="block text-sm text-gray-500">Si no lo tildás, quedan ocultos para que les sumes la foto antes de mostrarlos.</span></span>
            </label>
          )}
          <button type="button" onClick={save} disabled={busy || news + upd === 0} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-lg font-bold text-white hover:bg-coal disabled:opacity-50" data-testid="import-save">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />} Guardar {news + upd} productos
          </button>
        </section>
      )}
    </div>
  );
}
