'use client';
import { useEffect, useState } from 'react';
import { BellRing, CircleCheck, Loader2, Truck } from 'lucide-react';
import { joinShippingWaitlistAction } from '@/app/order-actions';

/** Cartel "Envíos próximamente" con el botón "Avisame cuando haya envíos". */
export function ShippingSoon({ text, compact = false }: { text: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('nexo-aviso-envios')) setDone(true);
      const saved = JSON.parse(localStorage.getItem('nexo-datos') || '{}');
      setName(saved.name ?? ''); setPhone(saved.phone ?? '');
    } catch { /* */ }
  }, []);

  // Sin <form>: este cartel también aparece dentro del formulario del carrito.
  async function send() {
    if (phone.replace(/\D/g, '').length < 8) return setErr('Escribí tu WhatsApp con código de área.');
    setBusy(true); setErr(null);
    const r = await joinShippingWaitlistAction({ name: name || undefined, phone }).catch(() => ({ ok: false as const, error: 'Sin conexión. Probá de nuevo.' }));
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setDone(true);
    try { localStorage.setItem('nexo-aviso-envios', '1'); } catch { /* */ }
  }

  const input = 'w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-white placeholder:text-white/35 outline-none focus:border-gold focus:ring-2 focus:ring-gold/30';
  return (
    <div className={`rounded-2xl border border-dashed border-gold/40 bg-gold/[0.06] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex items-start gap-3">
        <span className={`flex shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ${compact ? 'size-10' : 'size-12'}`}><Truck className={compact ? 'size-5' : 'size-6'} /></span>
        <div className="min-w-0 flex-1">
          <p className={`font-display font-extrabold ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>{text}</p>
          <p className="mt-0.5 text-sm text-mist">Por ahora, retiro en el local. {done ? '' : 'Si querés, te avisamos apenas arranquemos.'}</p>
        </div>
      </div>
      {done ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-300"><CircleCheck className="size-4" /> ¡Listo! Te avisamos por WhatsApp cuando haya envíos.</p>
      ) : open ? (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre (opcional)" autoComplete="name" maxLength={80} className={input} aria-label="Tu nombre" />
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setErr(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder="Tu WhatsApp" inputMode="tel" autoComplete="tel" maxLength={30} required className={input} aria-label="Tu WhatsApp" aria-invalid={!!err} />
          <button type="button" onClick={send} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-2.5 font-bold text-ink transition hover:bg-gold-soft active:scale-95 disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Avisame</button>
          {err && <p role="alert" className="text-sm font-semibold text-red-400 sm:col-span-3">{err}</p>}
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/50 px-4 py-2 text-sm font-bold text-gold transition hover:bg-gold hover:text-ink"><BellRing className="size-4" /> Avisame cuando haya envíos</button>
      )}
    </div>
  );
}
