'use client';
import { useEffect } from 'react';

/** Aparición al desplazarse + resplandor de tarjetas que sigue al cursor. */
export function Interactions() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as HTMLElement | null)?.closest?.('.glow-card') as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${ev.clientX - r.left}px`);
      card.style.setProperty('--my', `${ev.clientY - r.top}px`);
    };
    document.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      io.disconnect();
      document.removeEventListener('pointermove', onMove);
    };
  }, []);
  return null;
}
