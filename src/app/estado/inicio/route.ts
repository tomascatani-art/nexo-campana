export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('p') || '/';
  const t = Date.now();
  let out: string;
  try {
    const r = await fetch(new URL(req.url).origin + path, { cache: 'no-store', signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'nexo-estado' } });
    const reader = r.body!.getReader();
    let size = 0; let first = -1;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const { done, value } = await Promise.race([reader.read(), new Promise<{ done: true; value: undefined }>((res) => setTimeout(() => res({ done: true, value: undefined }), Math.max(1, deadline - Date.now())))]);
      if (value) { if (first < 0) first = Date.now() - t; size += value.length; }
      if (done) break;
    }
    out = `Página ${path}: ${r.status} · primeros datos ${first} ms · ${Math.round(size / 1024)} KB · total ${Date.now() - t} ms`;
  } catch (e) {
    out = `Página ${path}: ERROR (${Date.now() - t} ms) · ${String((e as Error).message || e).slice(0, 200)}`;
  }
  return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
