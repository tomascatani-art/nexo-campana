'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicProduct } from '@/lib/types';
import { unitPriceFor } from '@/lib/pricing';
import { trackProductAction } from '@/app/order-actions';

// Carrito del cliente. Se guarda en el navegador; los precios salen siempre de la base (actualizados).
type Line = { id: string; v?: string; qty: number };
export type CartLine = Line & { key: string; product: PublicProduct; variant: PublicProduct['variants'][number] | null; unit: number | null; subtotal: number | null; bulk: boolean; max: number | null };
type Ctx = {
  lines: CartLine[];
  count: number;
  total: number;
  hasUnpriced: boolean;
  qtyOf: (id: string, v?: string) => number;
  set: (id: string, qty: number, v?: string) => void;
  add: (id: string, qty?: number, v?: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  lastAdded: { id: string; name: string; at: number } | null;
  gone: string[];
  dropGone: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = 'nexo-carrito-v2';
const k = (id: string, v?: string) => (v ? `${id}:${v}` : id);

export function ListProvider({ products, children }: { products: PublicProduct[]; children: React.ReactNode }) {
  const [raw, setRaw] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<Ctx['lastAdded']>(null);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(v)) setRaw(v.filter((l) => l && typeof l.id === 'string' && Number.isInteger(l.qty) && l.qty > 0));
    } catch { /* sin almacenamiento */ }
    const onOpen = () => setOpen(true);
    window.addEventListener('open-cart', onOpen);
    return () => window.removeEventListener('open-cart', onOpen);
  }, []);

  const persist = useCallback((next: Line[]) => {
    setRaw(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const maxFor = useCallback((id: string, v?: string) => {
    const p = byId.get(id);
    if (!p) return 0;
    if (v) return p.variants.find((x) => x.id === v)?.max_qty ?? 9999;
    return p.max_qty ?? 9999;
  }, [byId]);

  const set = useCallback((id: string, qty: number, v?: string) => {
    const q = Math.max(0, Math.min(Math.round(qty) || 0, maxFor(id, v), 9999));
    const key = k(id, v);
    const exists = raw.some((l) => k(l.id, l.v) === key);
    const others = raw.filter((l) => k(l.id, l.v) !== key);
    persist(q <= 0 ? others : exists ? raw.map((l) => (k(l.id, l.v) === key ? { ...l, qty: q } : l)) : [...raw, { id, v, qty: q }]);
  }, [raw, persist, maxFor]);

  const add = useCallback((id: string, qty = 1, v?: string) => {
    const cur = raw.find((l) => k(l.id, l.v) === k(id, v))?.qty ?? 0;
    set(id, cur + qty, v);
    setLastAdded({ id, name: byId.get(id)?.name ?? '', at: Date.now() });
    if (cur === 0) trackProductAction(id, 'add').catch(() => {});
  }, [raw, set, byId]);

  const lines: CartLine[] = raw.flatMap((l) => {
    const product = byId.get(l.id);
    if (!product || product.availability === 'out') return [];
    const variant = l.v ? product.variants.find((x) => x.id === l.v) ?? null : null;
    if (l.v && (!variant || !variant.available)) return [];
    if (!l.v && product.variants.length) return [];
    // si el stock bajó desde que lo agregó, la cantidad se ajusta sola a lo que hay
    const max = variant ? variant.max_qty : product.max_qty;
    if (max != null && l.qty > max) l = { ...l, qty: max };
    const unit = unitPriceFor(product, l.qty, variant?.price);
    return [{ ...l, key: k(l.id, l.v), product, variant, unit, subtotal: unit == null ? null : unit * l.qty, bulk: unit != null && product.price != null && unit < product.price && !variant?.price, max: variant ? variant.max_qty : product.max_qty }];
  });
  // productos que estaban en el carrito y se quedaron sin stock (para avisarle al cliente)
  const gone = raw.flatMap((l) => {
    const product = byId.get(l.id);
    if (!product) return [];
    const variant = l.v ? product.variants.find((x) => x.id === l.v) : null;
    return product.availability === 'out' || (l.v && variant && !variant.available) ? [product.name + (variant ? ` (${variant.name})` : '')] : [];
  });
  const value: Ctx = {
    lines, gone,
    dropGone: () => persist(raw.filter((l) => { const p = byId.get(l.id); if (!p) return false; const v = l.v ? p.variants.find((x) => x.id === l.v) : null; return !(p.availability === 'out' || (l.v && v && !v.available)); })),
    count: lines.reduce((a, l) => a + l.qty, 0),
    total: lines.reduce((a, l) => a + (l.subtotal ?? 0), 0),
    hasUnpriced: lines.some((l) => l.unit == null),
    qtyOf: (id, v) => raw.find((l) => k(l.id, l.v) === k(id, v))?.qty ?? 0,
    set, add, clear: () => persist([]), open, setOpen, lastAdded,
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useList() {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useList fuera de ListProvider');
  return c;
}
