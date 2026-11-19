import { withOffer } from '@/lib/pricing';
import sharp from 'sharp';
import { sql } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/auth';
import { getPublicProducts, getSettings } from '@/lib/data';
import { FORMATS, newsImage, productImage, type Format } from '@/lib/share-image';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Imagen lista para compartir: /compartir/<id>?f=foto|post|story|og   y   /compartir/novedades
// "foto" = la foto del producto tal cual (JPEG, el formato que mejor acepta WhatsApp).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await getSettings();
  if (id === 'novedades') {
    const items = [...(await getPublicProducts())].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return newsImage(items, s);
  }
  if (!UUID.test(id)) return new Response('Not found', { status: 404 });
  const fRaw = new URL(req.url).searchParams.get('f');
  if (fRaw === 'foto') {
    const [img] = await sql<{ data: Buffer; active: boolean }[]>`
      select i.data, p.active from products p join images i on i.id = p.image_id where p.id = ${id}`;
    if (img && (img.active || (await getCurrentAdmin()))) {
      const jpg = await sharp(img.data).flatten({ background: '#ffffff' }).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' } });
    }
  }
  const f = fRaw as Format | null;
  const format: Format = f && f in FORMATS ? f : 'post';
  const [p] = await sql<{ name: string; image_id: string | null; price: number | null; old_price: number | null; unit_label: string | null; bulk_qty: number | null; bulk_price: number | null; is_new: boolean; created_at: string; active: boolean; offer_price: number | null; offer_from: string | null; offer_until: string | null }[]>`
    select name, image_id, offer_price::float8 as offer_price, offer_from, offer_until, price::float8 as price, old_price::float8 as old_price, unit_label, bulk_qty, bulk_price::float8 as bulk_price, is_new, created_at, active
    from products where id = ${id}`;
  if (!p || (!p.active && !(await getCurrentAdmin()))) return new Response('Not found', { status: 404 });
  return productImage(withOffer(p), s, format);
}
