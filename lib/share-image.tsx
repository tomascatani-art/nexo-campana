import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ImageResponse } from 'next/og';
import { sql } from './db';
import { discountPct, formatPrice } from './pricing';
import type { Settings } from './types';

// Genera la imagen lista para publicar en el canal de WhatsApp / estados / Instagram.
export const FORMATS = {
  post: { width: 1080, height: 1350 }, // vertical 4:5 (canal, Instagram)
  story: { width: 1080, height: 1920 }, // estados de WhatsApp
  ig: { width: 1080, height: 1920 }, // historia de Instagram: deja libre arriba y abajo (barra, perfil y "Enviar mensaje")
  og: { width: 1200, height: 630 }, // vista previa de enlaces
} as const;
export type Format = keyof typeof FORMATS;

let fontsCache: { name: string; data: Buffer; weight: 500 | 700 | 800 | 900; style: 'normal' }[] | null = null;
async function fonts() {
  if (fontsCache) return fontsCache;
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  const w = [500, 700, 800, 900] as const;
  fontsCache = await Promise.all(w.map(async (weight) => ({ name: 'Montserrat', data: await readFile(path.join(dir, `montserrat-latin-${weight}-normal.woff`)), weight, style: 'normal' as const })));
  return fontsCache;
}

async function imageData(id: string | null, w: number, h: number) {
  if (!id) return null;
  const [img] = await sql<{ data: Buffer }[]>`select data from images where id = ${id}`;
  if (!img) return null;
  const buf = await sharp(img.data).resize(w, h, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

const GOLD = '#f2c230';

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="31" fill="#0b0b0c" />
      <circle cx="32" cy="32" r="28.5" fill="none" stroke={GOLD} strokeWidth="2.5" />
      <path d="M19 46V18h8l11 16V18h7v28h-8L26 30v16z" fill={GOLD} />
    </svg>
  );
}

type P = { name: string; image_id: string | null; price: number | null; old_price: number | null; unit_label: string | null; bulk_qty: number | null; bulk_price: number | null; is_new: boolean; created_at: string };

export async function productImage(p: P, s: Settings, format: Format) {
  const { width, height } = FORMATS[format];
  const host = (s.site_url || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const off = discountPct(p.price, p.old_price);
  const badge = off ? `-${off}% OFF` : p.is_new && Date.now() - new Date(p.created_at).getTime() < 21 * 864e5 ? 'NUEVO INGRESO' : null;
  const logo = await imageData(s.logo_image_id, 160, 160);

  if (format === 'og') {
    const photo = await imageData(p.image_id, 630, 630);
    return new ImageResponse(
      <div style={{ width, height, display: 'flex', background: '#0b0b0c', fontFamily: 'Montserrat', color: 'white' }}>
        <div style={{ width: 630, height: 630, display: 'flex', background: 'white', position: 'relative' }}>
          {photo && <img src={photo} width={630} height={630} style={{ objectFit: 'cover' }} alt="" />}
          {badge && <div style={{ position: 'absolute', top: 28, left: 28, background: off ? '#dc2626' : GOLD, color: off ? 'white' : '#0b0b0c', fontWeight: 900, fontSize: 28, padding: '10px 22px', borderRadius: 999 }}>{badge}</div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '44px 44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {logo ? <img src={logo} width={64} height={64} style={{ borderRadius: 999 }} alt="" /> : <Mark size={64} />}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5 }}>{s.business_name.toUpperCase()}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: GOLD, letterSpacing: 4 }}>{s.business_kind.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: p.name.length > 40 ? 36 : 44, fontWeight: 800, lineHeight: 1.1 }}>{p.name}</span>
            {p.price != null ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 18 }}>
                <span style={{ fontSize: 72, fontWeight: 900, color: GOLD }}>{formatPrice(p.price)}</span>
                {p.old_price != null && <span style={{ fontSize: 30, color: '#a1a1aa', textDecoration: 'line-through' }}>{formatPrice(p.old_price)}</span>}
              </div>
            ) : <span style={{ fontSize: 44, fontWeight: 900, color: GOLD, marginTop: 18 }}>Consultá el precio</span>}
          </div>
          <span style={{ fontSize: 22, color: '#a1a1aa' }}>{host || s.city || ''}</span>
        </div>
      </div>,
      { width, height, fonts: await fonts(), headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600' } },
    );
  }

  const story = format === 'story' || format === 'ig';
  const ig = format === 'ig';
  const photoH = ig ? 860 : story ? 1000 : 760;
  const photo = await imageData(p.image_id, 1000, photoH);
  const priceSize = p.price != null && (formatPrice(p.price)?.length ?? 0) > 11 ? 120 : 140;
  return new ImageResponse(
    <div style={{ width, height, display: 'flex', flexDirection: 'column', background: '#0b0b0c', fontFamily: 'Montserrat', color: 'white', padding: ig ? '230px 40px 290px' : story ? '110px 40px 90px' : '40px 40px 36px', position: 'relative' }}>
      <div style={{ position: 'absolute', right: -200, top: -200, width: 700, height: 700, borderRadius: 999, background: 'rgba(242,194,48,0.18)', filter: 'blur(90px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {logo ? <img src={logo} width={84} height={84} style={{ borderRadius: 999 }} alt="" /> : <Mark size={84} />}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1 }}>{s.business_name.toUpperCase()}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: GOLD, letterSpacing: 6 }}>{(s.tagline || s.business_kind).toUpperCase()}</span>
          </div>
        </div>
        {badge && <div style={{ display: 'flex', background: off ? '#dc2626' : GOLD, color: off ? 'white' : '#0b0b0c', fontWeight: 900, fontSize: 30, padding: '14px 26px', borderRadius: 999 }}>{badge}</div>}
      </div>
      <div style={{ display: 'flex', marginTop: 30, width: 1000, height: photoH, borderRadius: 40, overflow: 'hidden', background: 'white' }}>
        {photo && <img src={photo} width={1000} height={photoH} style={{ objectFit: 'cover' }} alt="" />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, flex: 1 }}>
        <span style={{ fontSize: p.name.length > 34 ? 46 : 56, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{p.name}</span>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {p.old_price != null && <span style={{ fontSize: 40, color: '#a1a1aa', textDecoration: 'line-through' }}>{formatPrice(p.old_price)}</span>}
            {p.price != null ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <span style={{ fontSize: priceSize, fontWeight: 900, color: GOLD, lineHeight: 1, letterSpacing: -3 }}>{formatPrice(p.price)}</span>
                {p.unit_label && <span style={{ fontSize: 34, color: '#a1a1aa', fontWeight: 700 }}>{p.unit_label}</span>}
              </div>
            ) : <span style={{ fontSize: 80, fontWeight: 900, color: GOLD }}>Consultá el precio</span>}
          </div>
          {p.bulk_qty && p.bulk_price != null && (p.price == null || p.bulk_price < p.price) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: `4px solid ${GOLD}`, borderRadius: 28, padding: '14px 22px' }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: GOLD }}>LLEVANDO {p.bulk_qty}+</span>
              <span style={{ fontSize: 44, fontWeight: 900 }}>{formatPrice(p.bulk_price)}</span>
              <span style={{ fontSize: 22, color: '#a1a1aa' }}>c/u</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, paddingTop: 22, borderTop: '2px solid rgba(255,255,255,0.15)', fontSize: 26, color: '#d4d4d8' }}>
        <span style={{ fontWeight: 700 }}>{[s.address, s.city].filter(Boolean).join(' · ')}</span>
        <span style={{ fontWeight: 800, color: GOLD }}>{host || 'Pedí por WhatsApp'}</span>
      </div>
    </div>,
    { width, height, fonts: await fonts(), headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600' } },
  );
}

/** Collage para la vista previa de "Novedades" (hasta 4 productos). */
export async function newsImage(items: { image_id: string | null }[], s: Settings) {
  const { width, height } = FORMATS.og;
  const photos = await Promise.all(items.slice(0, 4).map((p) => imageData(p.image_id, 300, 300)));
  return new ImageResponse(
    <div style={{ width, height, display: 'flex', background: '#0b0b0c', fontFamily: 'Montserrat', color: 'white', padding: 50, gap: 40, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 440 }}>
        <Mark size={90} />
        <span style={{ fontSize: 26, fontWeight: 700, color: GOLD, letterSpacing: 6, marginTop: 26 }}>{s.business_name.toUpperCase()}</span>
        <span style={{ fontSize: 84, fontWeight: 900, lineHeight: 1, marginTop: 8 }}>Novedades</span>
        <span style={{ fontSize: 28, color: '#a1a1aa', marginTop: 18 }}>Productos nuevos con precio. Armá tu lista.</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, width: 616 }}>
        {photos.map((ph, i) => (
          <div key={i} style={{ display: 'flex', width: 300, height: 255, borderRadius: 24, overflow: 'hidden', background: 'white' }}>
            {ph && <img src={ph} width={300} height={255} style={{ objectFit: 'cover' }} alt="" />}
          </div>
        ))}
      </div>
    </div>,
    { width, height, fonts: await fonts(), headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600' } },
  );
}
