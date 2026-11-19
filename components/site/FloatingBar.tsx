'use client';
import { useEffect, useState } from 'react';
import { CircleCheck, ShoppingBag } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';
import { formatPrice } from '@/lib/pricing';
import { useList } from './ListProvider';

/** WhatsApp flotante + barra "Ver carrito" en el celular + aviso al agregar. */
export function FloatingBar({ wa }: { wa: string | null }) {
  const { count, total, setOpen, open, lastAdded } = useList();
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!lastAdded) return;
    setToast(lastAdded.name);
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [lastAdded]);
  if (open) return null;
  return (
    <>
      {toast && (
        <div role="status" className="animate-pop no-print fixed inset-x-4 top-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-gold/40 bg-ink/95 p-3.5 text-white shadow-2xl backdrop-blur">
          <CircleCheck className="size-6 shrink-0 text-gold" />
          <p className="min-w-0 flex-1 text-sm"><span className="block font-bold">Agregado al carrito</span><span className="block truncate text-mist">{toast}</span></p>
          <button onClick={() => setOpen(true)} className="shrink-0 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-ink">Ver</button>
        </div>
      )}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-end gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {count > 0 && (
          <button onClick={() => setOpen(true)} className="animate-pop pointer-events-auto flex flex-1 items-center justify-between gap-3 rounded-2xl bg-gold px-5 py-3.5 font-bold text-ink shadow-2xl shadow-black/50 sm:hidden">
            <span className="flex items-center gap-2"><ShoppingBag className="size-5" /> Ver carrito ({count})</span>
            <span className="font-display text-lg font-black">{formatPrice(total)}</span>
          </button>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Escribinos por WhatsApp" className="pointer-events-auto relative flex size-14 shrink-0 items-center justify-center rounded-full bg-wa text-white shadow-2xl shadow-wa/40 transition hover:scale-110">
            <span className="absolute inset-0 animate-ping rounded-full bg-wa opacity-25" />
            <WhatsAppIcon className="relative size-8" />
          </a>
        )}
      </div>
    </>
  );
}
