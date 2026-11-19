'use client';
import { useMemo, useState, useTransition } from 'react';
import { Copy, Pencil, RotateCcw, Send } from 'lucide-react';
import { WhatsAppPreview } from '@/components/admin/ShareKit';
import { WhatsAppIcon } from '@/components/icons';
import { DEFAULT_GREETING, fillGreeting } from '@/lib/messages';
import { saveGreetingAction } from '@/app/admin/actions';

type Vals = Parameters<typeof fillGreeting>[1];

/** "Saludo del día": BUEN JUEVES PARA TODOS… con el día, el estado y las políticas completos solos. */
export function Greeting({ template, vals, channelUrl }: { template: string | null; vals: Vals; channelUrl: string | null }) {
  const [tpl, setTpl] = useState(template || DEFAULT_GREETING);
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const text = useMemo(() => fillGreeting(tpl, vals), [tpl, vals]);

  async function share() {
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(text); } catch { /* */ }
    setNote('Texto copiado. Pegalo en tu canal.');
    window.open(channelUrl || `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="greeting">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">☀️ Saludo del día</h2>
          <p className="text-sm text-gray-500">El día, si hoy abrís (respeta los feriados), el recargo y la cotización se completan solos.</p>
        </div>
        <button type="button" onClick={() => setEdit(!edit)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"><Pencil className="size-4" /> {edit ? 'Listo' : 'Cambiar el texto'}</button>
      </div>
      {edit && (
        <div className="mt-3">
          <textarea value={tpl} onChange={(e) => setTpl(e.target.value)} rows={12} className="w-full rounded-xl border border-gray-300 p-3 font-mono text-sm outline-none focus:border-gold-deep" aria-label="Plantilla del saludo" />
          <p className="mt-1 text-xs text-gray-500">Podés usar {'{DIA}'}, {'{ESTADO}'}, {'{RECARGO}'}, {'{COTIZACION}'} y {'{NEGOCIO}'}. *negrita*, _cursiva_.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={() => start(async () => { await saveGreetingAction(tpl); setNote('Plantilla guardada ✓'); setEdit(false); })} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Guardar plantilla</button>
            <button type="button" onClick={() => setTpl(DEFAULT_GREETING)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"><RotateCcw className="size-4" /> Original</button>
          </div>
        </div>
      )}
      <div className="mt-4"><WhatsAppPreview text={text} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={share} className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3.5 font-bold text-white" data-testid="greeting-share"><WhatsAppIcon className="size-5" /> Compartir en mi canal</button>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setNote('Texto copiado ✓'); } catch { /* */ } }} className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3.5 font-semibold"><Copy className="size-4" /> Copiar texto</button>
      </div>
      {note && <p role="status" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700"><Send className="size-4" /> {note}</p>}
    </section>
  );
}
