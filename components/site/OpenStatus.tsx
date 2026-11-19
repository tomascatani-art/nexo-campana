'use client';
import { useEffect, useState } from 'react';
import type { Hours, SpecialDay } from '@/lib/types';
import { isOpenNow } from '@/lib/format';

export function OpenStatus({ hours, specials = [] }: { hours: Hours[]; specials?: SpecialDay[] }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const tick = () => setOpen(isOpenNow(hours, new Date(), specials));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [hours, specials]);
  if (open === null) return null;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${open ? 'border-green-400/40 bg-green-400/10 text-green-300' : 'border-white/15 bg-white/5 text-mist'}`}>
      <span className={`size-2 rounded-full ${open ? 'animate-pulse-dot bg-green-400' : 'bg-mist'}`} /> {open ? 'Abierto ahora' : 'Cerrado ahora'}
    </span>
  );
}
