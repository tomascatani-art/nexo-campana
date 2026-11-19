'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, ChevronDown, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { formatPrice, toUsd } from '@/lib/pricing';

export type SignProduct = {
  id: string; name: string; sku: string | null; price: number | null; old_price: number | null; unit_label: string | null;
  bulk_qty: number | null; bulk_price: number | null; category_id: string | null; category_name: string | null;
  active: boolean; is_new: boolean; url: string; image_id: string | null;
};
type Shop = { name: string; kind: string; address: string; cashPct: number | null; usdRate: number | null; logoId: string | null };
type Size = 'grande' | 'mediano' | 'chico';
type Theme = 'oferta' | 'nexo' | 'claro';
type Quick = { id: string; name: string; price: string; old: string; phrase: string; bulkQty: string; bulkPrice: string };
type Sign = {
  key: string; name: string; price: number | null; priceText: string | null; old_price: number | null; unit_label: string | null;
  bulk_qty: number | null; bulk_price: number | null; url: string | null; phrase: string; fromWeb: boolean;
};

const SIZES: [Size, string, string, number][] = [
  ['grande', 'Grande', '1 por hoja · vidriera o producto grande', 1],
  ['mediano', 'Mediano', '4 por hoja · para pegar en el producto', 4],
  ['chico', 'Etiqueta', '8 por hoja · para el estante', 8],
];
const THEMES: [Theme, string, string][] = [
  ['oferta', 'Oferta', 'linear-gradient(135deg,#ffd400 60%,#e10600 60%)'],
  ['nexo', 'Negro y dorado', 'linear-gradient(135deg,#0b0b0c 60%,#f2c230 60%)'],
  ['claro', 'Blanco (ahorra tinta)', 'linear-gradient(135deg,#ffffff 60%,#0b0b0c 60%)'],
];
const BADGES = ['¡OFERTA!', '¡IMPERDIBLE!', 'LIQUIDACIÓN', 'PROMO', 'NUEVO', 'ÚLTIMAS UNIDADES', ''];
const HOT = new Set(['¡OFERTA!', '¡IMPERDIBLE!', 'LIQUIDACIÓN']);
const GOLD = '#f2c230';
const INK = '#0b0b0c';
const RED = '#e10600';
const YELLOW = '#ffd400';

/** "15000", "$15.000" o "15.000,50" → número; si no es un número ("$1.500 c/u"), se usa el texto tal cual. */
function parsePrice(raw: string): { n: number | null; text: string | null } {
  const t = raw.trim();
  if (!t) return { n: null, text: null };
  const clean = t.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(clean) ? { n: Math.round(Number(clean)), text: null } : { n: null, text: t };
}

const newQuick = (): Quick => ({ id: `q-${Math.random().toString(36).slice(2, 9)}`, name: '', price: '', old: '', phrase: '', bulkQty: '', bulkPrice: '' });
type Opt = { cash: boolean; cashPct: string; bulk: boolean; usd: boolean; old: boolean; name: boolean; footer: boolean; qr: boolean };

export function Carteles({ products, categories, initialIds, shop }: { products: SignProduct[]; categories: { id: string; name: string }[]; initialIds: string[]; shop: Shop }) {
  const preset = initialIds.filter((id) => products.some((p) => p.id === id));
  const [quick, setQuick] = useState<Quick[]>(preset.length ? [] : [newQuick()]);
  const [sel, setSel] = useState<string[]>(preset);
  const [showWeb, setShowWeb] = useState(preset.length > 0);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [size, setSize] = useState<Size>('mediano');
  const [theme, setTheme] = useState<Theme>('oferta');
  const [badge, setBadge] = useState('¡OFERTA!');
  const [opt, setOpt] = useState<Opt>({ cash: false, cashPct: String(shop.cashPct || 5), bulk: true, usd: false, old: true, name: true, footer: true, qr: false });
  const [qrs, setQrs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.category_id === cat) && (!t || p.name.toLowerCase().includes(t) || (p.sku ?? '').toLowerCase().includes(t)));
  }, [products, q, cat]);

  const signs: Sign[] = useMemo(() => [
    ...quick.filter((f) => f.name.trim() || f.price.trim()).map((f) => {
      const pr = parsePrice(f.price); const old = parsePrice(f.old).n;
      const bq = parseInt(f.bulkQty, 10); const bp = parsePrice(f.bulkPrice).n;
      return { key: f.id, name: f.name.trim(), price: pr.n, priceText: pr.text, old_price: old && pr.n && old > pr.n ? old : null, unit_label: null, bulk_qty: bp ? (bq > 1 ? bq : null) : null, bulk_price: bp, url: null, phrase: f.phrase.trim(), fromWeb: false };
    }),
    ...sel.map((id) => products.find((p) => p.id === id)).filter((p): p is SignProduct => !!p).map((p) => ({
      key: p.id, name: p.name, price: p.price, priceText: null, old_price: p.old_price, unit_label: p.unit_label, bulk_qty: p.bulk_qty, bulk_price: p.bulk_price, url: p.url, phrase: '', fromWeb: true,
    })),
  ], [quick, sel, products]);

  useEffect(() => {
    if (!opt.qr) return;
    const missing = signs.filter((s) => s.url && !qrs[s.url]);
    if (!missing.length) return;
    Promise.all(missing.map(async (s) => [s.url!, await QRCode.toString(s.url!, { type: 'svg', margin: 0, color: { dark: INK, light: '#ffffff' } })] as const))
      .then((r) => setQrs((o) => ({ ...o, ...Object.fromEntries(r) })));
  }, [signs, opt.qr, qrs]);

  const per = SIZES.find((s) => s[0] === size)![3];
  const pages: Sign[][] = [];
  for (let i = 0; i < signs.length; i += per) pages.push(signs.slice(i, i + per));

  // Vista previa: la hoja A4 real (en mm) achicada para que entre en la pantalla.
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setZoom(Math.min(1, el.clientWidth / 800)));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const upd = (i: number, k: keyof Quick, v: string) => setQuick(quick.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white hover:border-gray-400'}`;
  const inp = 'w-full rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30';

  return (
    <>
      <style>{`@page { size: A4; margin: 0; } @media print { .sheets { zoom: 1 !important; gap: 0 !important; } .sheet { box-shadow: none !important; margin: 0 !important; break-after: page; } }`}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Carteles de precio</h1>
          <p className="text-gray-500">Escribí el precio, elegí el diseño e imprimí. Listo para pegar en el producto.</p>
        </div>
        <button type="button" onClick={() => window.print()} disabled={!signs.length} className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 font-bold text-white disabled:opacity-40" data-testid="print-signs">
          <Printer className="size-5" /> Imprimir {signs.length ? `${signs.length} cartel${signs.length > 1 ? 'es' : ''}` : ''}
        </button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <div className="no-print space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 font-bold">1. Precio</p>
            {quick.map((f, i) => (
              <div key={f.id} className="mb-3 grid gap-2 rounded-xl bg-gray-50 p-3" data-testid="quick-sign">
                <div className="flex gap-2">
                  <input value={f.price} onChange={(e) => upd(i, 'price', e.target.value.slice(0, 20))} inputMode="decimal" placeholder="Precio (ej: 15000)" className={`${inp} text-lg font-bold`} aria-label="Precio" />
                  {quick.length > 1 && <button type="button" onClick={() => setQuick(quick.filter((_, j) => j !== i))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" aria-label="Quitar cartel"><Trash2 className="size-4" /></button>}
                </div>
                <input value={f.name} onChange={(e) => upd(i, 'name', e.target.value.slice(0, 60))} placeholder="Qué es (opcional, ej: Espejo con luces)" className={inp} aria-label="Qué es" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={f.old} onChange={(e) => upd(i, 'old', e.target.value.slice(0, 20))} inputMode="decimal" placeholder="Antes $ (opcional)" className={inp} aria-label="Precio anterior" />
                  <input value={f.phrase} onChange={(e) => upd(i, 'phrase', e.target.value.slice(0, 60))} placeholder="Frase (opcional)" className={inp} aria-label="Frase" />
                </div>
                {opt.bulk && (
                  <div className="grid grid-cols-2 gap-2">
                    <input value={f.bulkPrice} onChange={(e) => upd(i, 'bulkPrice', e.target.value.slice(0, 20))} inputMode="decimal" placeholder="Precio mayorista $" className={inp} aria-label="Precio mayorista" />
                    <input value={f.bulkQty} onChange={(e) => upd(i, 'bulkQty', e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="Desde (unidades)" className={inp} aria-label="Mayorista desde" />
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setQuick([...quick, newQuick()])} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-400 px-4 py-2.5 font-semibold text-gray-700 hover:border-gold-deep"><Plus className="size-4" /> Otro cartel</button>

            <button type="button" onClick={() => setShowWeb(!showWeb)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-left text-sm font-semibold text-gray-700" aria-expanded={showWeb}>
              <span>…o traer el precio de un producto de la web {sel.length > 0 && <span className="text-gold-deep">({sel.length})</span>}</span>
              <ChevronDown className={`size-4 transition ${showWeb ? 'rotate-180' : ''}`} />
            </button>
            {showWeb && (
              <div className="mt-2">
                <div className="flex gap-2">
                  <label className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto" className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 outline-none focus:border-gold-deep" aria-label="Buscar producto" /></label>
                  <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-gray-300 px-2 text-sm" aria-label="Categoría"><option value="">Todas</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
                <ul className="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                        <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} className="size-5 accent-[#c99a12]" />
                        <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{p.name}</span><span className="text-sm text-gray-500">{formatPrice(p.price) ?? 'Sin precio'}</span></span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-2 font-bold">2. Diseño</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(([v, l, bg]) => (
                <button key={v} type="button" onClick={() => setTheme(v)} aria-pressed={theme === v} className={`overflow-hidden rounded-xl border-2 text-xs font-bold ${theme === v ? 'border-gold-deep ring-2 ring-gold/40' : 'border-gray-200'}`}>
                  <span className="block h-12" style={{ background: bg }} /><span className="block px-1 py-1.5">{l}</span>
                </button>
              ))}
            </div>
            <p className="mb-1.5 mt-4 text-sm font-semibold text-gray-700">Cartel de arriba</p>
            <div className="flex flex-wrap gap-2">
              {BADGES.map((b) => <button key={b || 'none'} type="button" onClick={() => setBadge(b)} className={chip(badge === b)}>{b || 'Sin cartel'}</button>)}
            </div>
            <p className="mb-2 mt-4 text-sm font-semibold text-gray-700">Tamaño</p>
            <div className="grid gap-2">
              {SIZES.map(([v, l, d]) => (
                <button key={v} type="button" onClick={() => setSize(v)} aria-pressed={size === v} className={`flex items-center gap-3 rounded-xl border-2 p-2.5 text-left ${size === v ? 'border-gold-deep bg-gold/10' : 'border-gray-200'}`}>
                  <span className={`grid size-5 place-items-center rounded-full border-2 ${size === v ? 'border-gold-deep bg-gold text-ink' : 'border-gray-300'}`}>{size === v && <Check className="size-3.5" />}</span>
                  <span className="text-sm"><b>{l}</b> <span className="text-gray-500">{d}</span></span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" data-testid="sign-options">
            <p className="mb-1 font-bold">3. Qué mostrar</p>
            <p className="mb-3 text-sm text-gray-500">Prendé o apagá cada parte del cartel.</p>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <input type="checkbox" checked={opt.cash} onChange={(e) => setOpt({ ...opt, cash: e.target.checked })} className="size-5 accent-[#c99a12]" />
                <span className="flex-1 font-semibold">Precio en efectivo</span>
                <span className="relative"><input value={opt.cashPct} onChange={(e) => setOpt({ ...opt, cash: true, cashPct: e.target.value.replace(/[^\d.,]/g, '').slice(0, 4) })} inputMode="decimal" className="w-20 rounded-lg border border-gray-300 py-2 pl-3 pr-7 text-right font-bold" aria-label="Descuento en efectivo (%)" /><span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-gray-500">%</span></span>
                <span className="text-gray-500">menos</span>
              </label>
              {([
                ['bulk', 'Precio mayorista', 'Aparece para cargarlo en cada cartel'],
                ['old', 'Precio anterior tachado', 'Con el % de descuento'],
                ['usd', shop.usdRate ? 'Precio en dólares' : null, 'Con la cotización del día del tablero'],
                ['name', 'Nombre del producto', null],
                ['footer', 'Logo y nombre del local', null],
                ['qr', sel.length ? 'QR para pedir por la web' : null, 'Solo en los productos traídos de la web'],
              ] as const).filter(([, l]) => l).map(([k, l, d]) => (
                <label key={k} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                  <input type="checkbox" checked={opt[k]} onChange={(e) => setOpt({ ...opt, [k]: e.target.checked })} className="size-5 accent-[#c99a12]" />
                  <span><span className="font-semibold">{l}</span>{d && <span className="block text-gray-500">{d}</span>}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
        <div ref={box} className="min-w-0">
          {!signs.length ? (
            <div className="no-print grid min-h-80 place-items-center rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
              <div><Printer className="mx-auto size-10" /><p className="mt-3 font-semibold">Escribí un precio y acá ves cómo queda.</p></div>
            </div>
          ) : (
            <>
              <p className="no-print mb-2 text-sm text-gray-500">Vista previa · {pages.length} hoja{pages.length > 1 ? 's' : ''} A4</p>
              <div className="sheets flex flex-col items-center gap-6" style={{ zoom }} data-testid="sign-sheets">
                {pages.map((pg, i) => (
                  <div key={i} className="sheet bg-white shadow-xl" style={{ width: '210mm', height: '297mm', padding: size === 'grande' ? '8mm' : '6mm', display: 'grid', gap: size === 'grande' ? 0 : '4mm', gridTemplateColumns: size === 'grande' ? '1fr' : '1fr 1fr', gridTemplateRows: size === 'grande' ? '1fr' : size === 'mediano' ? '1fr 1fr' : 'repeat(4, 1fr)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                    {pg.map((s, j) => <SignCard key={s.key + j} s={s} size={size} theme={theme} badge={badge} opt={opt} shop={shop} qr={s.url && opt.qr ? qrs[s.url] : undefined} />)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Logo({ size }: { size: string }) {
  return (
    <svg viewBox="0 0 64 64" style={{ width: size, height: size, flexShrink: 0 }} aria-hidden>
      <circle cx="32" cy="32" r="32" fill={INK} />
      <circle cx="32" cy="32" r="28.5" fill="none" stroke={GOLD} strokeWidth="3" />
      <path d="M19 46V18h8l11 16V18h7v28h-8L26 30v16z" fill={GOLD} />
    </svg>
  );
}

function SignCard({ s, size, theme, badge, opt, shop, qr }: { s: Sign; size: Size; theme: Theme; badge: string; opt: Opt; shop: Shop; qr?: string }) {
  const k = size === 'grande' ? 1 : size === 'mediano' ? 0.5 : 0.36; // escala de letras
  const mm = (n: number) => `${(n * k).toFixed(2)}mm`;
  const chico = size === 'chico';
  const C = theme === 'oferta'
    ? { bg: YELLOW, fg: INK, price: INK, muted: '#5b4a00', border: RED, band: RED, bandFg: '#fff', foot: INK, footFg: '#fff' }
    : theme === 'nexo'
      ? { bg: INK, fg: '#fff', price: GOLD, muted: '#a1a1aa', border: GOLD, band: HOT.has(badge) ? RED : GOLD, bandFg: HOT.has(badge) ? '#fff' : INK, foot: '#18181b', footFg: '#fff' }
      : { bg: '#fff', fg: INK, price: INK, muted: '#52525b', border: INK, band: INK, bandFg: '#fff', foot: '#fff', footFg: INK };
  const priceStr = s.priceText || formatPrice(s.price) || 'Consultá';
  const priceMm = Math.min(44, 250 / Math.max(5.5, priceStr.length)) * (chico ? 1.1 : 1);
  const oldP = opt.old ? s.old_price : null;
  const off = oldP && s.price ? Math.round((1 - s.price / oldP) * 100) : 0;
  const pct = Math.min(90, Math.max(0, Number(opt.cashPct.replace(',', '.')) || 0));
  const cash = opt.cash && pct && s.price ? Math.round(s.price * (1 - pct / 100)) : null;
  const usd = opt.usd && shop.usdRate && s.price ? toUsd(s.price, shop.usdRate) : null;
  const bulk = opt.bulk && s.bulk_price ? s.bulk_price : null;
  const svgQr = qr?.replace('<svg', '<svg width="100%" height="100%"');
  return (
    <article data-testid="sign" style={{ position: 'relative', overflow: 'hidden', background: C.bg, color: C.fg, border: `${chico ? '0.8mm' : mm(2.6)} solid ${C.border}`, borderRadius: mm(5), display: 'flex', flexDirection: 'column', fontFamily: 'Montserrat, Inter, sans-serif', minHeight: 0 }}>
      {theme === 'nexo' && <div style={{ position: 'absolute', right: '-20%', top: '-10%', width: '75%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,194,48,.22), transparent 65%)' }} />}
      {badge && (
        <div style={{ position: 'relative', background: C.band, color: C.bandFg, textAlign: 'center', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.02em', fontSize: chico ? '5.5mm' : mm(badge.length > 12 ? 15 : 22), lineHeight: 1, padding: chico ? '1.6mm 2mm' : `${mm(5)} ${mm(6)}`, textTransform: 'uppercase' }} data-testid="sign-badge">
          {badge}
        </div>
      )}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: chico ? '2mm 3mm' : `${mm(9)} ${mm(11)} ${mm(6)}` }}>
        {opt.name && s.name && <div style={{ fontWeight: 800, fontSize: chico ? '3.6mm' : mm(s.name.length > 30 ? 12 : 15), lineHeight: 1.1, letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: chico ? 2 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textTransform: 'uppercase' }}>{s.name}</div>}
        <div style={{ marginTop: 'auto', paddingTop: chico ? '1mm' : mm(6) }}>
          {oldP && (
            <div style={{ display: 'flex', alignItems: 'center', gap: mm(4) }}>
              <span style={{ fontSize: chico ? '3.4mm' : mm(11), color: C.muted, fontWeight: 800, textDecoration: 'line-through', textDecorationThickness: chico ? '0.4mm' : mm(1.2) }}>Antes {formatPrice(oldP)}</span>
              {off > 0 && <span style={{ background: RED, color: '#fff', fontWeight: 900, fontSize: chico ? '3mm' : mm(9), padding: chico ? '0.4mm 1.6mm' : `${mm(1.2)} ${mm(4)}`, borderRadius: '99mm', transform: 'rotate(-4deg)' }}>−{off}%</span>}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: mm(3), flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 900, fontSize: mm(priceMm), lineHeight: 0.95, letterSpacing: '-0.045em', color: C.price, whiteSpace: 'nowrap' }} data-testid="sign-price">{priceStr}</span>
            {s.unit_label && <span style={{ fontWeight: 700, fontSize: chico ? '2.8mm' : mm(7), color: C.muted }}>{s.unit_label}</span>}
          </div>
          <div style={{ marginTop: chico ? '0.8mm' : mm(3), display: 'flex', flexDirection: 'column', gap: chico ? '0.3mm' : mm(1.5), fontSize: chico ? '2.8mm' : mm(7), fontWeight: 800 }}>
            {s.phrase && <span>{s.phrase}</span>}
            {cash && <span data-testid="sign-cash">💵 En efectivo: <span style={{ color: theme === 'oferta' ? RED : C.price, fontWeight: 900 }}>{formatPrice(cash)}</span> <span style={{ color: C.muted, fontWeight: 700 }}>(−{pct}%)</span></span>}
            {bulk && <span data-testid="sign-bulk">📦 Precio mayorista{s.bulk_qty ? ` (desde ${s.bulk_qty} u.)` : ''}: <span style={{ color: theme === 'oferta' ? RED : C.price, fontWeight: 900 }}>{formatPrice(bulk)}</span></span>}
            {usd && <span>US$ {usd} <span style={{ color: C.muted, fontWeight: 600 }}>(dólar del día)</span></span>}
          </div>
        </div>
      </div>
      {opt.footer && <footer style={{ position: 'relative', background: C.foot, color: C.footFg, borderTop: theme === 'claro' ? `1px solid #e4e4e7` : 'none', display: 'flex', alignItems: 'center', gap: chico ? '1.5mm' : mm(4), padding: chico ? '1.2mm 3mm' : `${mm(4)} ${mm(11)}` }}>
        <Logo size={chico ? '5mm' : mm(13)} />
        <div style={{ lineHeight: 1.05, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: chico ? '2.8mm' : mm(7) }}>{shop.name.toUpperCase()}</div>
          {!chico && <div style={{ fontWeight: 700, fontSize: mm(3.6), letterSpacing: '0.18em', color: theme === 'claro' ? '#a17a05' : GOLD }}>{shop.kind.toUpperCase()}</div>}
        </div>
        {svgQr && <div style={{ marginLeft: 'auto', background: '#fff', padding: chico ? '0.5mm' : mm(1.5), borderRadius: mm(2), width: chico ? '9mm' : mm(24), height: chico ? '9mm' : mm(24), flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svgQr }} />}
      </footer>}
    </article>
  );
}
