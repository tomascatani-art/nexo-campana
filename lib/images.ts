import 'server-only';
import sharp, { type OutputInfo } from 'sharp';
import { sql } from './db';

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/heic', 'image/heif'];

/** Valida, corrige orientación, redimensiona y convierte a WebP. Devuelve el id. */
export async function storeImage(file: File, opts: { maxWidth?: number; keepAlpha?: boolean } = {}) {
  if (!file || file.size === 0) throw new Error('No se recibió ninguna imagen.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('La imagen es demasiado grande (máximo 12 MB).');
  if (file.type && !ALLOWED.includes(file.type)) throw new Error('Formato no permitido. Usá JPG, PNG o WebP.');
  const input = Buffer.from(await file.arrayBuffer());
  let out: { data: Buffer; info: OutputInfo };
  try {
    out = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width: opts.maxWidth ?? 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, alphaQuality: 90 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error('El archivo no es una imagen válida.');
  }
  const [row] = await sql<{ id: string }[]>`
    insert into images (data, mime, width, height, size_bytes)
    values (${out.data}, 'image/webp', ${out.info.width}, ${out.info.height}, ${out.data.length})
    returning id`;
  return row.id;
}

/** Borra imágenes que ya no usa nadie (y que tienen más de 1 día, por si hay un formulario abierto). */
export async function cleanupOrphanImages() {
  await sql`
    delete from images i
    where i.created_at < now() - interval '1 day'
      and not exists (select 1 from site_settings s where i.id in (s.hero_image_id, s.about_image_id, s.logo_image_id, s.hero_poster_id))
      and not exists (select 1 from products x where x.image_id = i.id or i.id = any(x.gallery))`;
}
