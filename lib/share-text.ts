import { discountPct, formatPrice } from './pricing';

export type ShareProductData = {
  id: string; slug: string; name: string; description: string | null; price: number | null; old_price: number | null;
  unit_label: string | null; bulk_qty: number | null; bulk_price: number | null;
  category_slug?: string | null;
  share_hook?: string | null; share_features?: string | null; share_closing?: string | null;
};

type Preset = { hook: string; closing: string };

/** Frases por defecto según la categoría (el dueño puede cambiarlas en cada producto). */
const PRESETS: [RegExp, Preset][] = [
  [/cocina/, { hook: '🍳🔥 ¡COCINÁ FÁCIL Y RICO! 🤩', closing: '🛒😍 ¡Hacé tu pedido y cociná todo más fácil!' }],
  [/bazar|vajilla/, { hook: '🍽️✨ ¡TU MESA, MÁS LINDA! 😍', closing: '🛒😍 ¡Hacé tu pedido y renová tu mesa!' }],
  [/tecno|audio|celu|compu/, { hook: '🎧⚡ ¡TECNOLOGÍA AL MEJOR PRECIO! 😎', closing: '🛒🔥 ¡Hacé tu pedido y llevate lo último!' }],
  [/clima|ventil|aire|calef/, { hook: '🌬️☀️ ¡PREPARATE PARA EL CALOR! 😎', closing: '🛒🔥 ¡Hacé tu pedido antes de que se agoten!' }],
  [/electro/, { hook: '⚡🏠 ¡HACETE LA VIDA MÁS FÁCIL! 🙌', closing: '🛒😍 ¡Hacé tu pedido antes de que se agote!' }],
  [/hogar|deco|bano|dormi/, { hook: '🏠✨ ¡ORDEN Y ESTILO PARA TU CASA! 🙌', closing: '🛒😍 ¡Hacé tu pedido y renová tu casa!' }],
];
const GENERIC: Preset = { hook: '🔥🛍️ ¡NUEVO INGRESO! 🤩', closing: '🛒😍 ¡Hacé tu pedido por WhatsApp!' };

export function presetFor(categorySlug: string | null | undefined): Preset {
  const s = (categorySlug ?? '').toLowerCase();
  return PRESETS.find(([re]) => re.test(s))?.[1] ?? GENERIC;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Características: las que cargó el dueño (una por línea) o, si no hay, sacadas de la descripción. */
export function featuresFor(p: Pick<ShareProductData, 'share_features' | 'description'>): string[] {
  const own = (p.share_features ?? '').split('\n').map((l) => l.replace(/^\s*(✅|[-•*])\s*/, '').trim()).filter(Boolean);
  if (own.length) return own.slice(0, 8);
  return (p.description ?? '')
    .split(/\n|\.\s+|;\s*|,\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])|\.$/)
    .map((l) => l.replace(/^\s*(y|e)\s+/i, '').trim())
    .filter((l) => l.length >= 3 && l.length <= 70)
    .slice(0, 4)
    .map(cap);
}

/** Publicación de un producto con el formato del canal: gancho, nombre, ✅ características, 💥 precio y cierre. */
export function buildSingleText(p: ShareProductData) {
  const preset = presetFor(p.category_slug);
  const lines = [p.share_hook?.trim() || preset.hook, '', `✨ ${p.name.toUpperCase()} ✨`];
  const feats = featuresFor(p);
  if (feats.length) lines.push('', ...feats.map((f) => `✅ ${f}`));
  lines.push('');
  if (p.price != null) {
    const unit = p.unit_label && p.unit_label !== 'c/u' ? ` (${p.unit_label})` : '';
    lines.push(`💥 PRECIO: ${formatPrice(p.price)}${unit} 💥`);
    const pct = discountPct(p.price, p.old_price);
    if (pct) lines.push(`Antes ~${formatPrice(p.old_price)}~ 👉 ¡Ahorrás ${pct}%!`);
    if (p.bulk_qty && p.bulk_price != null && (p.price == null || p.bulk_price < p.price)) lines.push(`📦 Llevando ${p.bulk_qty} o más: ${formatPrice(p.bulk_price)} c/u`);
  } else lines.push('💬 PRECIO: consultanos por privado');
  lines.push('', p.share_closing?.trim() || preset.closing);
  return lines.join('\n');
}

/** Línea opcional con el enlace para pedir desde la web. */
export function linkLine(p: Pick<ShareProductData, 'slug'>, site: string) {
  return `👉 Pedilo acá: ${site}/producto/${p.slug}`;
}

export function buildBatchText(ps: ShareProductData[], site: string, business: string, footer: string | null) {
  const lines = [`🔥 *Novedades en ${business}*`, ''];
  for (const p of ps) lines.push(`• ${p.name} — *${p.price != null ? formatPrice(p.price) : 'consultar'}*`);
  lines.push('', `🛒 Mirá todo y hacé tu pedido 👉 ${site}/novedades`);
  if (footer) lines.push('', footer);
  return lines.join('\n');
}

export type Template = 'clasica' | 'oferta' | 'corta';
export const TEMPLATES: [Template, string][] = [['clasica', 'Clásica'], ['oferta', 'Oferta flash'], ['corta', 'Corta']];

/** Plantilla "Oferta flash": precio anterior tachado y urgencia. */
export function buildOfferText(p: ShareProductData) {
  const lines = ['🔥🔥 ¡OFERTA FLASH! 🔥🔥', '', `✨ ${p.name.toUpperCase()} ✨`, ''];
  const pct = discountPct(p.price, p.old_price);
  if (p.price == null) lines.push('💬 Consultanos el precio por privado');
  else if (pct) lines.push(`❌ Antes: ~${formatPrice(p.old_price)}~`, `✅ AHORA: *${formatPrice(p.price)}* (-${pct}%)`);
  else lines.push(`💥 PRECIO ESPECIAL: *${formatPrice(p.price)}* 💥`);
  if (p.price != null && p.bulk_qty && p.bulk_price != null && p.bulk_price < p.price) lines.push(`📦 Llevando ${p.bulk_qty} o más: ${formatPrice(p.bulk_price)} c/u`);
  lines.push('', '⏰ ¡Solo por hoy o hasta agotar stock!');
  return lines.join('\n');
}

/** Plantilla "Corta": para subir muchos productos seguidos. */
export function buildShortText(p: ShareProductData, site: string) {
  return [`🆕 *${p.name}*`, `💲 ${p.price != null ? formatPrice(p.price) : 'Consultá el precio'}${p.unit_label && p.unit_label !== 'c/u' ? ` (${p.unit_label})` : ''}`, linkLine(p, site)].join('\n');
}

export function buildByTemplate(t: Template, p: ShareProductData, site: string) {
  return t === 'oferta' ? buildOfferText(p) : t === 'corta' ? buildShortText(p, site) : buildSingleText(p);
}

/** Plantilla "Combo": varios productos juntos con un precio especial. */
export function buildComboText(ps: ShareProductData[], comboPrice: number | null, site: string) {
  const sum = ps.reduce((a, p) => a + (p.price ?? 0), 0);
  const lines = ['🎁 ¡COMBO NEXO! 🎁', '', ...ps.map((p) => `✅ ${p.name}`), ''];
  if (comboPrice != null && comboPrice > 0) {
    const pct = sum > comboPrice ? Math.round((1 - comboPrice / sum) * 100) : 0;
    if (pct > 0) lines.push(`❌ Por separado: ~${formatPrice(sum)}~`);
    lines.push(`💥 COMBO: *${formatPrice(comboPrice)}* 💥${pct > 0 ? ` (ahorrás ${pct}%)` : ''}`);
  } else lines.push(`💥 Todo junto: *${formatPrice(sum)}* 💥`);
  lines.push('', '🛒 ¡Pedilo por WhatsApp antes de que se agote!', `👉 ${site}/novedades`);
  return lines.join('\n');
}
