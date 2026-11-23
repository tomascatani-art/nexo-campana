'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Envuelve el logo del pie: 5 toques seguidos (en menos de 3 segundos) abren el panel. */
export function SecretTap({ children, href = '/admin' }: { children: React.ReactNode; href?: string }) {
  const router = useRouter();
  const taps = useRef<number[]>([]);
  function onTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      router.push(href);
    }
  }
  return <div onClick={onTap} className="inline-block select-none [-webkit-tap-highlight-color:transparent]">{children}</div>;
}
