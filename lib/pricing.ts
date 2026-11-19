// Reglas de precio compartidas por la web, el carrito y el servidor.
export type Priceable = { price: number | null; bulk_qty: number | null; bulk_price: number | null };

/** Precio unitario según la cantidad (aplica el precio mayorista si corresponde). Una variante puede tener precio propio. */
export function unitPriceFor(p: Priceable, qty: number, variantPrice?: number | null) {
  const base = variantPrice ?? p.price;
  if (base == null) return null;
  if (variantPrice == null && p.bulk_qty && p.bulk_price != null && qty >= p.bulk_qty) return Math.min(p.bulk_price, base);
  return base;
}

export function shippingFor(s: { shipping_cost: number | null; free_shipping_from: number | null; shipping_zones?: { name: string; cost: number | null }[] }, subtotal: number, zone?: string | null) {
  if (s.free_shipping_from != null && subtotal >= s.free_shipping_from) return 0;
  if (s.shipping_zones?.length) return s.shipping_zones.find((z) => z.name === zone)?.cost ?? null; // por zona
  return s.shipping_cost; // monto fijo (null = a convenir)
}

export function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export function discountPct(price: number | null, old: number | null) {
  if (price == null || old == null || old <= price) return null;
  return Math.round((1 - price / old) * 100);
}

/** Oferta programada: ¿está vigente ahora? */
export function offerActive(p: { offer_price: number | null; offer_from: string | Date | null; offer_until: string | Date | null }, now = Date.now()) {
  if (p.offer_price == null) return false;
  if (p.offer_from && new Date(p.offer_from).getTime() > now) return false;
  if (p.offer_until && new Date(p.offer_until).getTime() < now) return false;
  return true;
}

/** Descuento por pagar en efectivo, redondeado a pesos. */
export function cashDiscount(pct: number | null | undefined, subtotal: number, payment: string | null | undefined) {
  if (!pct || pct <= 0 || payment !== 'efectivo') return 0;
  return Math.round((subtotal * Math.min(pct, 50)) / 100);
}

/** Producto con la oferta programada aplicada (si está vigente): precio de oferta y el normal tachado. */
export function withOffer<T extends { price: number | null; old_price: number | null; offer_price?: number | null; offer_from?: string | Date | null; offer_until?: string | Date | null }>(p: T): T {
  const o = { offer_price: p.offer_price ?? null, offer_from: p.offer_from ?? null, offer_until: p.offer_until ?? null };
  if (!offerActive(o) || p.price == null || o.offer_price! >= p.price) return p;
  return { ...p, price: o.offer_price, old_price: Math.max(p.price, p.old_price ?? 0) };
}

/** Ajustes según la forma de pago: descuento en efectivo y recargo por transferencia (general o por categoría). */
export type PayRules = { cashPct: number | null; transferPct: number | null; catPct: Record<string, number> };
export function paymentAdjust(lines: { subtotal: number; cat: string | null }[], payment: string | null | undefined, r: PayRules) {
  const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
  const discount = cashDiscount(r.cashPct, subtotal, payment);
  let surcharge = 0;
  if (payment === 'transferencia') {
    for (const l of lines) {
      const pct = l.cat != null && l.cat in r.catPct ? r.catPct[l.cat] : r.transferPct ?? 0;
      surcharge += Math.round((l.subtotal * Math.min(Math.max(pct, 0), 50)) / 100);
    }
  }
  return { discount, surcharge };
}

/** Total en dólares a la cotización del día (redondeado hacia arriba al dólar). */
export function toUsd(ars: number, rate: number | null | undefined) {
  if (!rate || rate <= 0) return null;
  return Math.ceil(ars / rate);
}

/** "5% en productos y 10% en Celulares" */
export function surchargeText(general: number | null, cats: { name: string; pct: number }[]) {
  const fmt = (n: number) => `${n.toLocaleString('es-AR')}%`;
  const parts = [general ? `${fmt(general)} en productos` : null, ...cats.filter((c) => c.pct !== (general ?? 0)).map((c) => `${fmt(c.pct)} en ${c.name.toLowerCase()}`)].filter(Boolean);
  return parts.length ? parts.join(parts.length > 2 ? ', ' : ' y ') : null;
}
