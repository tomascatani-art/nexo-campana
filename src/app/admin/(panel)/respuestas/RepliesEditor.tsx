'use client';
import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';

type R = { title: string; text: string; preview: string };
const inp = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30';

export function RepliesEditor({ replies }: { replies: R[] }) {
  const [rows, setRows] = useState(replies.map((r, k) => ({ k, ...r })));
  const [n, setN] = useState(replies.length);
  const [copied, setCopied] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.k} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <input name="r_title" defaultValue={r.title} maxLength={40} placeholder="Título (ej: Cómo llegar)" className={`${inp} font-semibold`} aria-label="Título" />
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(r.preview); setCopied(r.k); setTimeout(() => setCopied(null), 1500); } catch { /* */ } }} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold hover:bg-gray-50"><Copy className="size-4" /> {copied === r.k ? 'Copiado' : 'Copiar'}</button>
            <button type="button" onClick={() => setRows(rows.filter((x) => x.k !== r.k))} className="rounded-lg p-2.5 text-red-600 hover:bg-red-50" aria-label="Quitar respuesta"><Trash2 className="size-5" /></button>
          </div>
          <textarea name="r_text" defaultValue={r.text} rows={2} maxLength={600} className={`${inp} mt-2`} aria-label="Mensaje" />
        </div>
      ))}
      <button type="button" onClick={() => { setRows([...rows, { k: n, title: '', text: '', preview: '' }]); setN(n + 1); }} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:border-gold-deep"><Plus className="size-4" /> Agregar respuesta</button>
    </div>
  );
}
