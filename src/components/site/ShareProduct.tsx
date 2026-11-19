'use client';
import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export function ShareProduct({ title, text, url }: { title: string; text: string; url: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch { /* cancelado */ }
  }
  return (
    <button onClick={share} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3.5 font-semibold text-white transition hover:border-white/40">
      {done ? <Check className="size-5 text-wa" /> : <Share2 className="size-5" />} {done ? 'Enlace copiado' : 'Compartir'}
    </button>
  );
}
