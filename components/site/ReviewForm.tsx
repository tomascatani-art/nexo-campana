'use client';
import { useState } from 'react';
import { CircleCheck, Loader2, Star } from 'lucide-react';
import { submitReviewAction } from '@/app/order-actions';

export function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setErr('Elegí de 1 a 5 estrellas.');
    setBusy(true); setErr(null);
    const r = await submitReviewAction({ name, rating, text, website: trap }).catch(() => ({ ok: false as const, error: 'Sin conexión. Probá de nuevo.' }));
    setBusy(false);
    if (r.ok) setOk(true); else setErr(r.error);
  }

  if (ok) return <p className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-5 font-semibold" role="status"><CircleCheck className="size-6 shrink-0 text-gold" /> ¡Gracias por tu opinión! La vamos a publicar en breve.</p>;
  return (
    <form onSubmit={send} className="space-y-3 rounded-2xl border border-white/10 bg-coal p-5" data-testid="review-form">
      <p className="font-display text-lg font-black">¿Ya nos compraste? Contanos qué tal</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Puntaje">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} estrella${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="p-1">
            <Star className={`size-8 transition ${n <= rating ? 'fill-gold text-gold' : 'text-white/25 hover:text-gold/60'}`} />
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Tu nombre" className="w-full rounded-xl border border-white/15 bg-steel px-4 py-3 outline-none focus:border-gold" />
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={600} required rows={3} placeholder="¿Qué compraste? ¿Cómo te atendieron?" className="w-full rounded-xl border border-white/15 bg-steel px-4 py-3 outline-none focus:border-gold" />
      <input value={trap} onChange={(e) => setTrap(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {err && <p role="alert" className="text-sm font-medium text-red-300">{err}</p>}
      <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-bold text-ink hover:bg-gold-soft disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />} Enviar opinión</button>
      <p className="text-xs text-mist">Se publica después de que el local la revisa.</p>
    </form>
  );
}
