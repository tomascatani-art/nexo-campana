'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/**
 * Video de entrada: en el celular ocupa toda la portada; en la compu va en un marco dorado
 * a la derecha, con la misma imagen desenfocada de fondo. Silenciado, en loop y liviano:
 * no se reproduce con "ahorro de datos" ni con "reducir movimiento", y se pausa fuera de pantalla.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || conn?.saveData;
    if (still) { setPaused(true); return; }
    const play = () => v.play().then(() => setPaused(false)).catch(() => setPaused(true));
    const io = new IntersectionObserver(([e]) => { if (userPaused.current) return; if (e.isIntersecting) play(); else v.pause(); }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { userPaused.current = false; v.play().then(() => setPaused(false)).catch(() => {}); }
    else { userPaused.current = true; v.pause(); setPaused(true); }
  }

  return (
    <>
      {/* fondo de compu: la misma escena desenfocada */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" aria-hidden className="absolute inset-0 -z-30 hidden size-full scale-110 object-cover opacity-40 blur-2xl lg:block" />
      <div className="absolute inset-0 -z-20 overflow-hidden lg:inset-auto lg:right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:top-1/2 lg:z-0 lg:aspect-[720/1308] lg:h-[min(76vh,46rem)] lg:-translate-y-[45%] lg:rounded-[2rem] lg:border lg:border-gold/50 lg:shadow-[0_30px_120px_-20px_rgb(243_199_79/.35)]">
        <video
          ref={ref}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Video de la entrada del local"
          onPlaying={() => setReady(true)}
          className={`hero-zoom size-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-90'}`}
          data-testid="hero-video"
        />
        <div className="pointer-events-none absolute inset-0 hidden rounded-[2rem] ring-1 ring-inset ring-white/10 lg:block" />
      </div>
      <button type="button" onClick={toggle} aria-label={paused ? 'Reproducir video' : 'Pausar video'} className="absolute bottom-5 right-4 z-10 flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur transition hover:text-gold sm:right-6 lg:bottom-8">
        {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
      </button>
    </>
  );
}
