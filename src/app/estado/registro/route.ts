import { readTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

// Resumen por visita: qué pasos llegó a hacer cada una.
export async function GET(req: Request) {
  const lines = await readTrace();
  if (new URL(req.url).searchParams.has('todo')) return new Response(lines.join('\n') || '(vacío)', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  const by = new Map<string, string[]>();
  for (const l of lines) {
    const m = /^(\S+) \[(\w+)\] (.*)$/.exec(l);
    if (!m) continue;
    const msg = m[3].startsWith('sql#') ? 'SQL' : m[3];
    const arr = by.get(m[2]) ?? [];
    const last = arr[arr.length - 1];
    if (msg === 'SQL' && last?.startsWith('SQLx')) arr[arr.length - 1] = `SQLx${Number(last.slice(4)) + 1}`;
    else arr.push(msg === 'SQL' ? 'SQLx1' : `${m[1]} ${msg}`);
    by.set(m[2], arr);
  }
  const out = [...by].map(([k, v]) => `VISITA ${k}:\n  ` + v.join('\n  ')).join('\n\n');
  return new Response(out || '(vacío)', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
