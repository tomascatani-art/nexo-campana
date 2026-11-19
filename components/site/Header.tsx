'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, ShoppingBag, X } from "lucide-react";
import { useList } from './ListProvider';

const LINKS = [
  ['/#catalogo', 'Catálogo'],
  ['/#ofertas', 'Ofertas'],
  ['/novedades', 'Novedades'],
  ['/#como-comprar', 'Cómo comprar'],
  ['/#nosotros', 'Nosotros'],
  ['/#ubicacion', 'Ubicación'],
] as const;

export function Header({ logo, hasOffers, announcement, notice }: { logo: React.ReactNode; hasOffers: boolean; announcement: string | null; notice?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count, setOpen: openList, lastAdded } = useList();
  const path = usePathname();
  const links = LINKS.filter(([h]) => hasOffers || h !== '/#ofertas');
  const [bump, setBump] = useState(0);
  useEffect(() => { if (lastAdded) setBump((b) => b + 1); }, [lastAdded]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || open || path !== '/';
  return (
    <header className={`no-print fixed inset-x-0 top-0 z-40 transition-all duration-500 ${solid ? 'border-b border-white/10 bg-ink/90 backdrop-blur-xl' : 'bg-transparent'}`}>
      {announcement && (
        <div className={`overflow-hidden bg-gold text-center text-xs font-bold text-ink transition-all duration-500 sm:text-sm ${scrolled ? 'max-h-0 py-0' : 'max-h-16 px-4 py-2'}`}>{announcement}</div>
      )}
      {notice && (
        <div role="note" className={`overflow-hidden border-b border-gold/30 bg-coal text-center text-xs font-bold text-gold transition-all duration-500 sm:text-sm ${scrolled ? 'max-h-0 py-0' : 'max-h-16 px-4 py-2'}`}>{notice}</div>
      )}
      <div className={`mx-auto flex transition-all duration-500 ${solid ? 'py-2' : 'py-4'} max-w-7xl items-center justify-between gap-3 px-4 sm:px-6`}>
        <Link href="/" aria-label="Ir al inicio" className="shrink-0" onClick={() => setOpen(false)}>{logo}</Link>
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="group relative rounded-md px-3 py-2 text-sm font-semibold text-white/75 transition hover:text-white">
                  {label}
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => openList(true)} className="btn-shine relative inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-ink shadow-lg shadow-gold/20 transition hover:bg-gold-soft active:scale-95">
            <ShoppingBag className="size-5" />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && <span key={bump} className="animate-pop inline-flex min-w-6 items-center justify-center rounded-full bg-ink px-1.5 py-0.5 text-xs font-black text-gold">{count}</span>}
          </button>
          <button onClick={() => setOpen((v) => !v)} className="rounded-full border border-white/15 p-2.5 text-white lg:hidden" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Menú" className="h-[calc(100dvh-4rem)] overflow-y-auto px-4 pb-10 pt-4 lg:hidden">
          <ul className="space-y-1">
            {links.map(([href, label], i) => (
              <li key={href} className="reveal is-visible" style={{ ['--d' as string]: `${i * 40}ms` }}>
                <Link href={href} onClick={() => setOpen(false)} className="flex items-center justify-between border-b border-white/10 py-4 font-display text-2xl font-extrabold text-white">
                  {label} <span className="text-gold">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
