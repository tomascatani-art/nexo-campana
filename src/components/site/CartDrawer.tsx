'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleAlert, CircleCheck, Copy, Info, Loader2, Minus, Plus, ShoppingBag, Store, Trash2, Truck, X } from 'lucide-react';
import { formatPrice, paymentAdjust, shippingFor } from '@/lib/pricing';
import { submitOrderAction } from '@/app/order-actions';
import { PAYMENT_METHODS } from '@/lib/types';
import { WhatsAppIcon } from '@/components/icons';
import { useList } from './ListProvider';
import { ShippingSoon } from './ShippingSoon';

export type CheckoutConfig = {
  businessName: string; whatsapp: string | null; note: string | null;
  pickup: boolean; shipping: boolean; shippingCost: number | null; freeFrom: number | null; shippingInfo: string | null;
  shippingSoon: string | null; zones: { name: string; cost: number | null }[];
  payments: string[]; transferInfo: string | null; minTotal: number | null; address: string;
  cashPct: number | null;
  transferPct: number | null; catPct: Record<string, number>; usdRate: number | null;
  transferNotice: string | null; refundPolicy: string | null;
};

type Form = { name: string; phone: string; delivery: 'retiro' | 'envio'; address: string; zone: string; payment: string; note: string };

export function CartDrawer({ cfg }: { cfg: CheckoutConfig }) {
  const { lines, total, count, hasUnpriced, set, clear, open, setOpen } = useList();
  const [step, setStep] = useState<'cart' | 'datos' | 'listo'>('cart');
  const [f, setF] = useState<Form>({ name: '', phone: '', delivery: cfg.pickup || !cfg.shipping ? 'retiro' : 'envio', address: '', zone: '', payment: cfg.payments[0] ?? '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const [done, setDone] = useState<{ code: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nexo-datos') || '{}');
      setF((cur) => ({ ...cur, name: saved.name ?? '', phone: saved.phone ?? '', address: saved.address ?? '', zone: cfg.zones.some((z) => z.name === saved.zone) ? saved.zone : '' }));
    } catch { /* */ }
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { setErr(null); setConfirmClear(false); if (step === 'listo') setStep('cart'); panel.current?.focus(); }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setOpen]);

  const ship = f.delivery === 'envio' ? shippingFor({ shipping_cost: cfg.shippingCost, free_shipping_from: cfg.freeFrom, shipping_zones: cfg.zones }, total, f.zone) : null;
  const freeShip = cfg.freeFrom != null && total >= cfg.freeFrom;
  const { discount: disc, surcharge } = paymentAdjust(lines.map((l) => ({ subtotal: l.subtotal ?? 0, cat: l.product.category_slug })), f.payment, { cashPct: cfg.cashPct, transferPct: cfg.transferPct, catPct: cfg.catPct });
  const grand = total - disc + surcharge + (ship ?? 0);
  const belowMin = cfg.minTotal != null && total < cfg.minTotal;
  const up = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); if (err?.field === k) setErr(null); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setErr({ text: 'Escribí tu nombre y apellido.', field: 'name' });
    if (f.phone.replace(/\D/g, '').length < 8) return setErr({ text: 'Escribí un teléfono válido (con código de área).', field: 'phone' });
    if (f.delivery === 'envio' && cfg.zones.length && !f.zone) return setErr({ text: 'Elegí tu zona de envío.', field: 'zone' });
    if (f.delivery === 'envio' && f.address.trim().length < 5) return setErr({ text: 'Escribí la dirección de entrega.', field: 'address' });
    setBusy(true);
    setErr(null);
    try { localStorage.setItem('nexo-datos', JSON.stringify({ name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(), zone: f.zone })); } catch { /* */ }
    // En celulares, la ventana se abre antes de esperar al servidor (si no, el navegador la bloquea).
    const win = cfg.whatsapp ? window.open('about:blank', '_blank') : null;
    const r = await submitOrderAction({ items: lines.map((l) => ({ id: l.id, v: l.v, qty: l.qty })), name: f.name, phone: f.phone, delivery: f.delivery, address: f.address || undefined, zone: f.delivery === 'envio' && f.zone ? f.zone : undefined, payment: f.payment || undefined, note: f.note || undefined }).catch(() => ({ ok: false as const, error: 'Sin conexión. Probá de nuevo.' }));
    setBusy(false);
    if (!r.ok) {
      win?.close();
      setErr({ text: r.error, field: 'field' in r ? r.field : undefined });
      return;
    }
    setDone({ code: r.code, message: r.message });
    setStep('listo');
    clear();
    if (cfg.whatsapp) {
      const url = waUrl(r.message);
      if (win) win.location.href = url; else window.location.href = url;
    }
  }
  const waUrl = (m: string) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(m)}`;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" style={{ animation: 'fade-in .25s ease' }} onClick={() => setOpen(false)} aria-label="Cerrar carrito" />
      <div ref={panel} tabIndex={-1} className="relative flex h-full w-full max-w-md flex-col bg-coal text-white shadow-2xl outline-none sm:border-l sm:border-white/10" style={{ animation: 'slide-in .4s cubic-bezier(.2,.8,.2,1)' }}>
        <style>{`@keyframes slide-in{from{transform:translateX(100%)}to{transform:none}}@keyframes fade-in{from{opacity:0}}`}</style>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          {step === 'datos' ? (
            <button onClick={() => setStep('cart')} className="inline-flex items-center gap-1.5 font-semibold text-mist hover:text-white"><ArrowLeft className="size-5" /> Carrito</button>
          ) : (
            <div>
              <h2 id="cart-title" className="flex items-center gap-2 font-display text-xl font-black"><ShoppingBag className="size-6 text-gold" /> {step === 'listo' ? '¡Pedido enviado!' : 'Tu carrito'}</h2>
              {step === 'cart' && <p className="text-sm text-mist">{count} {count === 1 ? 'unidad' : 'unidades'}</p>}
            </div>
          )}
          <Steps step={step} />
          <button onClick={() => setOpen(false)} className="rounded-full border border-white/15 p-2 hover:bg-white/10" aria-label="Cerrar"><X className="size-5" /></button>
        </div>

        {step === 'listo' && done ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="animate-pop flex size-20 items-center justify-center rounded-full bg-wa/15 text-wa"><CircleCheck className="size-11" /></div>
            <p className="mt-5 font-display text-2xl font-black">Pedido #{done.code}</p>
            <p className="mt-2 text-mist">{cfg.whatsapp ? 'Se abrió WhatsApp con tu pedido ordenado. Tocá Enviar y te respondemos para confirmar.' : 'Copiá el pedido y envialo a nuestro WhatsApp.'}</p>
            {cfg.whatsapp && <a href={waUrl(done.message)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-wa px-6 py-3.5 font-bold"><WhatsAppIcon className="size-5" /> Abrir WhatsApp de nuevo</a>}
            <button onClick={async () => { try { await navigator.clipboard.writeText(done.message); setCopied(true); } catch { /* */ } }} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-mist hover:text-white"><Copy className="size-4" /> {copied ? 'Copiado ✓' : 'Copiar pedido'}</button>
            {f.payment === 'transferencia' && (cfg.transferInfo ? <p className="mt-6 rounded-xl border border-white/10 p-3 text-sm text-mist">Para transferir: <span className="font-semibold text-white">{cfg.transferInfo}</span></p> : cfg.transferNotice ? <p className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm font-semibold text-amber-200">{cfg.transferNotice}</p> : null)}
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-gold/10 text-gold"><ShoppingBag className="size-9" /></div>
            <p className="mt-5 font-display text-xl font-bold">Tu carrito está vacío</p>
            <p className="mt-2 text-mist">Sumá productos y vas a ver el total de tu compra al instante, como una lista del súper.</p>
            <Link href="/#catalogo" onClick={() => setOpen(false)} className="mt-6 rounded-full bg-gold px-6 py-3 font-bold text-ink">Ver catálogo</Link>
          </div>
        ) : step === 'cart' ? (
          <>
            <ul className="flex-1 divide-y divide-white/10 overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-4">
                  <Link href={`/producto/${l.product.slug}`} onClick={() => setOpen(false)} className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
                    {l.product.image_id && <Image src={`/img/${l.product.image_id}`} alt="" fill sizes="64px" className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{l.product.name}</p>
                    {l.variant && <p className="text-xs font-semibold text-gold">{l.product.variant_label}: {l.variant.name}</p>}
                    <p className="mt-0.5 text-xs text-mist">{l.unit != null ? `${formatPrice(l.unit)} c/u` : 'Precio a consultar'}{l.bulk && <span className="ml-1 font-bold text-gold">· precio x cantidad</span>}</p>
                    {!l.bulk && !l.variant?.price && l.product.bulk_qty && l.product.bulk_price != null && l.qty < l.product.bulk_qty && (
                      <p className="mt-0.5 text-xs font-semibold text-gold/80">Sumá {l.product.bulk_qty - l.qty} más y pagás {formatPrice(l.product.bulk_price)} c/u</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-white/15">
                        <button onClick={() => set(l.id, l.qty - 1, l.v)} className="p-2 hover:bg-white/10" aria-label={`Quitar uno de ${l.product.name}`}>{l.qty === 1 ? <Trash2 className="size-4 text-red-400" /> : <Minus className="size-4" />}</button>
                        <input value={l.qty} inputMode="numeric" aria-label="Cantidad" onFocus={(e) => e.currentTarget.select()} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); if (n >= 1) set(l.id, n, l.v); }} className="w-11 bg-transparent text-center font-bold tabular-nums outline-none" />
                        <button onClick={() => set(l.id, l.qty + 1, l.v)} disabled={l.max != null && l.qty >= l.max} className="p-2 hover:bg-white/10 disabled:opacity-30" aria-label={`Sumar uno de ${l.product.name}`}><Plus className="size-4" /></button>
                      </div>
                      <span className="font-display text-lg font-black tabular-nums">{l.subtotal != null ? formatPrice(l.subtotal) : '—'}</span>
                    </div>
                  </div>
                </li>
              ))}
              <li className="py-4">
                {confirmClear ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
                    <span className="flex-1">¿Vaciar el carrito?</span>
                    <button onClick={() => setConfirmClear(false)} className="rounded-lg px-3 py-1.5 font-semibold hover:bg-white/10">No</button>
                    <button onClick={() => { clear(); setConfirmClear(false); }} className="rounded-lg bg-red-600 px-3 py-1.5 font-bold">Sí, vaciar</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-red-400"><Trash2 className="size-4" /> Vaciar carrito</button>
                )}
              </li>
            </ul>
            <div className="space-y-3 border-t border-white/10 bg-ink/60 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {cfg.shipping && cfg.freeFrom != null && total < cfg.freeFrom && (
                <div>
                  <p className="text-xs text-mist">Te faltan <b className="text-white">{formatPrice(cfg.freeFrom - total)}</b> para el envío gratis</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${Math.min(100, (total / cfg.freeFrom) * 100)}%` }} /></div>
                </div>
              )}
              <div className="flex items-end justify-between">
                <span className="text-sm font-semibold uppercase tracking-widest text-mist">Total</span>
                <span className="font-display text-3xl font-black text-gold tabular-nums">{formatPrice(total)}</span>
              </div>
              {hasUnpriced && <p className="text-xs text-mist">Algunos productos no tienen precio publicado: te lo pasamos por WhatsApp.</p>}
              {belowMin && <p className="text-sm font-semibold text-red-300">La compra mínima es de {formatPrice(cfg.minTotal)}.</p>}
              <button onClick={() => setStep('datos')} disabled={belowMin} className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-4 text-lg font-bold text-ink transition hover:bg-gold-soft active:scale-[.98] disabled:opacity-50">
                Continuar pedido
              </button>
              {cfg.note && <p className="flex gap-2 text-xs leading-relaxed text-mist"><Info className="mt-0.5 size-3.5 shrink-0" /> {cfg.note}</p>}
            </div>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <h3 className="font-display text-xl font-black">Tus datos</h3>
              <In label="Nombre y apellido" value={f.name} onChange={up('name')} autoComplete="name" invalid={err?.field === 'name'} required />
              <In label="Teléfono / WhatsApp" value={f.phone} onChange={up('phone')} autoComplete="tel" inputMode="tel" placeholder="3489 15-123456" invalid={err?.field === 'phone'} required />
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">¿Cómo lo recibís?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {cfg.pickup && <Opt checked={f.delivery === 'retiro'} onChange={() => setF({ ...f, delivery: 'retiro' })} icon={<Store className="size-5" />} title="Retiro en el local" sub={cfg.address} />}
                  {cfg.shipping && <Opt checked={f.delivery === 'envio'} onChange={() => setF({ ...f, delivery: 'envio' })} icon={<Truck className="size-5" />} title="Envío a domicilio" sub={freeShip ? 'GRATIS' : cfg.zones.length ? (f.delivery === 'envio' && f.zone ? (ship == null ? 'A convenir' : formatPrice(ship)!) : 'Según zona') : cfg.shippingCost != null ? formatPrice(cfg.shippingCost)! : 'A convenir'} />}
                </div>
                {f.delivery === 'envio' && cfg.shippingInfo && <p className="mt-2 text-xs text-mist">{cfg.shippingInfo}</p>}
              </fieldset>
              {cfg.shippingSoon && <ShippingSoon text={cfg.shippingSoon} compact />}
              {f.delivery === 'envio' && cfg.zones.length > 0 && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Zona de envío <span className="text-gold">*</span></span>
                  <select value={f.zone} onChange={up('zone')} aria-invalid={err?.field === 'zone'} className={`w-full rounded-xl border bg-steel px-4 py-3 outline-none focus:border-gold ${err?.field === 'zone' ? 'border-red-400' : 'border-white/15'}`}>
                    <option value="">Elegí tu zona…</option>
                    {cfg.zones.map((z) => <option key={z.name} value={z.name}>{z.name} · {freeShip ? 'GRATIS' : z.cost == null ? 'a convenir' : formatPrice(z.cost)}</option>)}
                  </select>
                </label>
              )}
              {f.delivery === 'envio' && <In label="Dirección de entrega" value={f.address} onChange={up('address')} autoComplete="street-address" placeholder="Calle, número, localidad" invalid={err?.field === 'address'} required />}
              {cfg.payments.length > 0 && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">¿Cómo vas a pagar?</span>
                  <select value={f.payment} onChange={up('payment')} className="w-full rounded-xl border border-white/15 bg-steel px-4 py-3 outline-none focus:border-gold">
                    {cfg.payments.map((p) => <option key={p} value={p}>{PAYMENT_METHODS[p] ?? p}{p === 'efectivo' && cfg.cashPct ? ` (${cfg.cashPct}% OFF)` : ''}{p === 'transferencia' && (cfg.transferPct || Object.keys(cfg.catPct).length) ? ' (con recargo)' : ''}</option>)}
                  </select>
                  <span className="mt-1 block text-xs text-mist">El pago se coordina con el local al confirmar el pedido.</span>
                  {f.payment === 'transferencia' && cfg.transferNotice && <span className="mt-2 flex gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm font-semibold text-amber-200" data-testid="transfer-notice"><CircleAlert className="mt-0.5 size-4 shrink-0" /> {cfg.transferNotice}</span>}
                  {f.payment === 'dolares' && <span className="mt-2 block rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">Se toma la cotización del dólar del día. El valor final se confirma en el local.</span>}
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Comentario (opcional)</span>
                <textarea value={f.note} onChange={up('note')} rows={2} maxLength={400} className="w-full rounded-xl border border-white/15 bg-steel px-4 py-3 outline-none focus:border-gold" placeholder="Horario para retirar, si sos revendedor, etc." />
              </label>
            </div>
            <div className="space-y-2 border-t border-white/10 bg-ink/60 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex justify-between text-sm text-mist"><span>Productos</span><span className="tabular-nums">{formatPrice(total)}</span></div>
              {surcharge > 0 && <div className="flex justify-between text-sm font-semibold text-amber-200" data-testid="transfer-surcharge"><span>Recargo por transferencia</span><span className="tabular-nums">+{formatPrice(surcharge)}</span></div>}
              {disc > 0 && <div className="flex justify-between text-sm font-semibold text-emerald-300" data-testid="cash-discount"><span>Descuento efectivo ({cfg.cashPct}%)</span><span className="tabular-nums">-{formatPrice(disc)}</span></div>}
              {f.delivery === 'envio' && <div className="flex justify-between text-sm text-mist"><span>Envío</span><span className="tabular-nums">{ship == null ? 'A convenir' : ship === 0 ? 'Gratis' : formatPrice(ship)}</span></div>}
              <div className="flex items-end justify-between"><span className="font-semibold">Total</span><span className="font-display text-2xl font-black text-gold tabular-nums">{formatPrice(grand)}</span></div>
              {cfg.refundPolicy && <p className="text-center text-[11px] leading-snug text-mist" data-testid="refund-policy">⚠️ {cfg.refundPolicy}</p>}
              {err && <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/15 p-3 text-sm font-medium text-red-200"><CircleAlert className="mt-0.5 size-4 shrink-0" /> {err.text}</p>}
              <button type="submit" disabled={busy} className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-wa py-4 text-lg font-bold text-white shadow-lg shadow-wa/20 transition hover:bg-wa-deep active:scale-[.98] disabled:opacity-60">
                {busy ? <Loader2 className="size-5 animate-spin" /> : <WhatsAppIcon className="size-6" />} Enviar pedido por WhatsApp
              </button>
              <p className="text-center text-xs text-mist">No se cobra nada ahora. Te confirmamos stock y forma de pago.</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Steps({ step }: { step: string }) {
  const i = step === 'cart' ? 0 : step === 'datos' ? 1 : 2;
  return (
    <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
      {[0, 1, 2].map((k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k <= i ? 'w-6 bg-gold' : 'w-3 bg-white/20'}`} />)}
    </div>
  );
}

function In({ label, invalid, ...props }: { label: string; invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}{props.required && <span className="text-gold"> *</span>}</span>
      <input {...props} aria-invalid={invalid} className={`w-full rounded-xl border bg-steel px-4 py-3 outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15 ${invalid ? 'border-red-400' : 'border-white/15'}`} />
    </label>
  );
}

function Opt({ checked, onChange, icon, title, sub }: { checked: boolean; onChange: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <label className={`flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-3 transition ${checked ? 'border-gold bg-gold/10' : 'border-white/15 hover:border-white/30'}`}>
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <span className={checked ? 'text-gold' : 'text-mist'}>{icon}</span>
      <span className="text-sm font-bold leading-tight">{title}</span>
      <span className="line-clamp-2 text-xs text-mist">{sub}</span>
    </label>
  );
}
