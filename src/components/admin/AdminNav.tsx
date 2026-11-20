'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Boxes, ClipboardList, Clock, DollarSign, ExternalLink, HelpCircle, House, KeyRound, LayoutGrid, LogOut, Menu, Package, Plus, BarChart3, MessageSquareText, QrCode, Tag, Users, Star, FileSpreadsheet, Store, Truck, X,
} from 'lucide-react';
import { logoutAction } from '@/app/admin/actions';
import { WhatsAppIcon } from '@/components/icons';

const NAV = [
  { href: '/admin', label: 'Tablero', icon: House },
  { href: '/admin/productos/nuevo', label: 'Cargar producto', icon: Plus },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/stock', label: 'Stock', icon: Boxes },
  { href: '/admin/importar', label: 'Cargar desde Excel', icon: FileSpreadsheet },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { href: '/admin/opiniones', label: 'Opiniones', icon: Star },
  { href: '/admin/canal', label: 'Compartir en canal', icon: WhatsAppIcon },
  { href: '/admin/respuestas', label: 'Respuestas rápidas', icon: MessageSquareText },
  { href: '/admin/precios', label: 'Aumentar precios', icon: DollarSign },
  { href: '/admin/categorias', label: 'Categorías', icon: LayoutGrid },
  { href: '/admin/negocio', label: 'Datos del negocio', icon: Store },
  { href: '/admin/envios', label: 'Envíos', icon: Truck },
  { href: '/admin/horarios', label: 'Horarios y feriados', icon: Clock },
  { href: '/admin/carteles', label: 'Carteles de precio', icon: Tag },
  { href: '/admin/cartel', label: 'Cartel con QR', icon: QrCode },
  { href: '/admin/cuenta', label: 'Mi cuenta', icon: KeyRound },
  { href: '/admin/ayuda', label: 'Ayuda', icon: HelpCircle },
];

export function AdminNav({ businessName, userName, newOrders }: { businessName: string; userName: string; newOrders: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === '/admin' || href === '/admin/cartel' ? path === href : href === '/admin/productos' ? path.startsWith(href) && !path.startsWith('/admin/productos/nuevo') : path.startsWith(href);

  const list = (
    <nav aria-label="Panel" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition ${isActive(href) ? 'bg-gold text-ink shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>
              <Icon className="size-5" /> {label}
              {href === '/admin/pedidos' && newOrders > 0 && <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{newOrders}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
  const footer = (
    <div className="space-y-1 border-t border-white/10 p-3">
      <a href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-white/75 hover:bg-white/10 hover:text-white"><ExternalLink className="size-5" /> Ver mi web</a>
      <form action={logoutAction}>
        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-white/75 hover:bg-white/10 hover:text-white">
          <LogOut className="size-5" /> Salir <span className="ml-auto truncate text-xs font-normal text-white/40">{userName}</span>
        </button>
      </form>
    </div>
  );
  const brand = (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="size-9" aria-hidden><circle cx="32" cy="32" r="28.5" fill="none" stroke="#f2c230" strokeWidth="3" /><path d="M19 46V18h8l11 16V18h7v28h-8L26 30v16z" fill="#f2c230" /></svg>
      <span className="leading-tight"><span className="block whitespace-nowrap font-display text-lg font-black uppercase text-white">{businessName}</span><span className="block whitespace-nowrap text-xs text-white/50">Panel de administración</span></span>
    </span>
  );

  const bottom = [
    { href: '/admin', label: 'Tablero', icon: House },
    { href: '/admin/productos', label: 'Productos', icon: Package },
    null,
    { href: '/admin/stock', label: 'Stock', icon: Boxes },
    { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  ];

  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-ink lg:flex">
        <div className="px-6 pb-3 pt-7">{brand}</div>
        {list}
        {footer}
      </aside>

      <header className="no-print fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-ink px-4 text-white lg:hidden">
        {brand}
        <div className="flex items-center gap-2">
          <form action={logoutAction}>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-2.5 py-2 text-sm font-semibold" aria-label="Cerrar sesión"><LogOut className="size-5" /> <span className="hidden min-[400px]:inline">Salir</span></button>
          </form>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 font-semibold" aria-label="Abrir menú"><Menu className="size-5" /> Menú</button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink lg:hidden">
          <div className="flex h-16 items-center justify-between px-4 text-white">
            {brand}
            <button onClick={() => setOpen(false)} className="rounded-xl border border-white/20 p-2" aria-label="Cerrar menú"><X className="size-5" /></button>
          </div>
          {list}
          {footer}
        </div>
      )}

      <nav aria-label="Accesos rápidos" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {bottom.map((n) =>
          n ? (
            <Link key={n.href} href={n.href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive(n.href) ? 'text-ink' : 'text-gray-500'}`}>
              <n.icon className={`size-6 ${isActive(n.href) ? 'text-gold-deep' : ''}`} /> {n.label}
              {n.href === '/admin/pedidos' && newOrders > 0 && <span className="absolute right-3 top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{newOrders}</span>}
            </Link>
          ) : (
            <Link key="nuevo" href="/admin/productos/nuevo" aria-label="Cargar producto" className="-mt-6 flex flex-col items-center gap-1 pb-2 text-[11px] font-bold text-ink">
              <span className="flex size-14 items-center justify-center rounded-full bg-gold shadow-lg shadow-gold/40 ring-4 ring-white"><Plus className="size-7" /></span>
              Cargar
            </Link>
          ),
        )}
      </nav>
    </>
  );
}
