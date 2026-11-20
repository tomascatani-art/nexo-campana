import { getPublicData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t = Date.now();
  let out: string;
  try {
    await Promise.race([getPublicData(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('no respondió en 8 segundos')), 8000))]);
    out = `Todo junto (como el inicio): ok (${Date.now() - t} ms)`;
  } catch (e) {
    out = `Todo junto (como el inicio): ERROR (${Date.now() - t} ms) · ${String((e as Error).message || e).slice(0, 300)}`;
  }
  return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
