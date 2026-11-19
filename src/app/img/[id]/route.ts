import { sql } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sirve las imágenes guardadas en la base. Cada imagen nueva recibe un id nuevo,
// por eso se pueden cachear "para siempre".
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response('Not found', { status: 404 });
  const load = () => sql<{ data: Buffer; mime: string }[]>`select data, mime from images where id = ${id}`;
  // Reintentos ante un error momentáneo de conexión (pasa con la base embebida del modo demo)
  let rows: Awaited<ReturnType<typeof load>> | null = null;
  for (let t = 0; !rows; t++) {
    try { rows = await load(); } catch (e) { if (t >= 3) throw e; await new Promise((r) => setTimeout(r, 120 * (t + 1))); }
  }
  const [img] = rows;
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      'Content-Type': img.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(img.data.length),
    },
  });
}
