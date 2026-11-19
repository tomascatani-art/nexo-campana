import { sql } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHUNK = 1024 * 1024; // máximo por respuesta parcial

// Sirve el video de portada guardado en la base. Soporta "Range" (lo exige Safari/iPhone para video).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response('Not found', { status: 404 });
  const [m] = await sql<{ mime: string; size: number }[]>`select mime, octet_length(data)::int as size from media where id = ${id} and complete`;
  if (!m) return new Response('Not found', { status: 404 });
  const base = { 'Content-Type': m.mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (!range) {
    const [r] = await sql<{ data: Buffer }[]>`select data from media where id = ${id}`;
    return new Response(new Uint8Array(r.data), { headers: { ...base, 'Content-Length': String(m.size) } });
  }
  let start = range[1] ? Number(range[1]) : Math.max(0, m.size - Number(range[2]));
  let end = range[1] && range[2] ? Number(range[2]) : m.size - 1;
  if (!range[1]) end = m.size - 1;
  end = Math.min(end, start + CHUNK - 1, m.size - 1);
  if (start >= m.size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${m.size}` } });
  const [r] = await sql<{ part: Buffer }[]>`select substring(data from ${start + 1} for ${end - start + 1}) as part from media where id = ${id}`;
  return new Response(new Uint8Array(r.part), {
    status: 206,
    headers: { ...base, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${m.size}` },
  });
}
