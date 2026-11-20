import type { Hours, SpecialDay } from './types';
export { formatPrice, discountPct, unitPriceFor } from './pricing';

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function formatHour(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return m === '00' ? `${Number(h)}` : `${Number(h)}:${m}`;
}

export function hoursText(h: Pick<Hours, 'is_open' | 'open1' | 'close1' | 'open2' | 'close2'>) {
  if (!h.is_open || !h.open1 || !h.close1) return 'Cerrado';
  let s = `${formatHour(h.open1)} a ${formatHour(h.close1)}`;
  if (h.open2 && h.close2) s += ` y ${formatHour(h.open2)} a ${formatHour(h.close2)}`;
  return s + ' hs';
}

/** Agrupa días consecutivos con el mismo horario: "Lunes a Sábado" */
export function groupHours(hours: Hours[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
  const groups: { days: number[]; text: string }[] = [];
  for (const d of order) {
    const h = byDay.get(d);
    if (!h) continue;
    const text = hoursText(h);
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.days.push(d);
    else groups.push({ days: [d], text });
  }
  return groups.map((g) => ({
    label: g.days.length === 1 ? DAY_NAMES[g.days[0]] : g.days.length === 2 ? `${DAY_NAMES[g.days[0]]} y ${DAY_NAMES[g.days[1]]}` : `${DAY_NAMES[g.days[0]]} a ${DAY_NAMES[g.days[g.days.length - 1]]}`,
    text: g.text,
  }));
}

export function nowInArgentina(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const wd = parts.find((p) => p.type === 'weekday')!.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
  const hh = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const mm = Number(parts.find((p) => p.type === 'minute')!.value);
  return { day, minutes: hh * 60 + mm, ymd: `${get('year')}-${get('month')}-${get('day')}` };
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export function isOpenNow(hours: Hours[], date = new Date(), specials: SpecialDay[] = []) {
  const { day, minutes, ymd } = nowInArgentina(date);
  const h = specials.find((x) => x.day === ymd) ?? hours.find((x) => x.day_of_week === day);
  if (!h || !h.is_open) return false;
  return [[h.open1, h.close1], [h.open2, h.close2]]
    .filter((r): r is [string, string] => !!r[0] && !!r[1])
    .some(([a, b]) => minutes >= toMin(a) && minutes < toMin(b));
}

export function waLink(number: string | null | undefined, text?: string) {
  const n = (number || '').replace(/\D/g, '');
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Devuelve la dirección (origen) si el texto es una URL web válida; si no, null. */
function cleanUrl(v: string | null | undefined): string | null {
  const t = (v || '').trim();
  if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Dirección pública de la web. Usa la primera que sea válida:
 * 1) NEXT_PUBLIC_SITE_URL (variable del hosting)  2) la guardada en la base
 * 3) la dirección que da Vercel  4) localhost. Nunca devuelve una URL rota.
 */
export function siteUrl(s?: { site_url: string | null } | null) {
  return (
    cleanUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    cleanUrl(s?.site_url) ||
    cleanUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    cleanUrl(process.env.VERCEL_URL) ||
    'http://localhost:3000'
  );
}

/** Fecha en formato ISO sin romper nunca (si el dato es inválido, devuelve `fallback`). */
export function safeIso(d: unknown): string;
export function safeIso<F extends string | null>(d: unknown, fallback: F): string | F;
export function safeIso(d: unknown, fallback: string | null = new Date(0).toISOString()): string | null {
  if (d == null || d === '') return fallback;
  const t = d instanceof Date ? d.getTime() : new Date(d as string | number).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : fallback;
}

export function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'producto';
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  const d = Math.floor(diff / 86400);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function stockState(p: { track_stock: boolean; stock_qty: number; min_stock: number }) {
  if (!p.track_stock) return 'untracked' as const;
  if (p.stock_qty <= 0) return 'out' as const;
  if (p.stock_qty <= p.min_stock) return 'low' as const;
  return 'ok' as const;
}

/** "Lunes 24/11" para un día especial (YYYY-MM-DD). */
export function specialDayLabel(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return `${DAY_NAMES[wd]} ${d}/${m}`;
}

/** Días especiales que conviene avisar en la web (próximos N días, incluido hoy). */
export function upcomingSpecials(specials: SpecialDay[], days = 10, date = new Date()) {
  const { ymd } = nowInArgentina(date);
  const limit = new Date(Date.parse(ymd + 'T12:00:00Z') + days * 864e5).toISOString().slice(0, 10);
  return specials.filter((s) => s.day >= ymd && s.day <= limit);
}

export function specialText(s: SpecialDay) {
  return s.is_open ? `abrimos de ${hoursText(s)}` : 'cerrado';
}
