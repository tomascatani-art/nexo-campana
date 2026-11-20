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
    const watch = (root: ParentNode) => root.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    watch(document);
    // La página llega por partes y al navegar aparecen secciones nuevas: también hay que observarlas
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => { if (n instanceof HTMLElement) { if (n.matches('.reveal:not(.is-visible)')) io.observe(n); watch(n); } });
    });
    mo.observe(document.body, { childList: true, subtree: true });

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
      mo.disconnect();
      document.removeEventListener('pointermove', onMove);
    };
  }, []);
  return null;
}
