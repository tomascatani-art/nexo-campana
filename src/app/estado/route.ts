import { sql } from '@/lib/db';
import { siteUrl } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Diagnóstico simple: abrí /estado para ver si la web llega a la base de datos.
// No muestra contraseñas ni datos privados.
export async function GET() {
  const lines: string[] = ['ESTADO DE LA WEB', ''];
  const raw = process.env.DATABASE_URL || '';
  let info = 'no está cargada';
  try {
    const u = new URL(raw);
    const kind = /pooler\.supabase\.com$/.test(u.hostname) ? 'pooler de Supabase' : /^db\..*\.supabase\.co$/.test(u.hostname) ? 'conexión DIRECTA de Supabase (no funciona en Vercel: usá la del pooler)' : 'otro servidor';
    const userOk = !/pooler\.supabase\.com$/.test(u.hostname) || /^postgres\.[a-z0-9]+$/.test(decodeURIComponent(u.username));
    info = `${kind} · puerto ${u.port || '5432'}${u.port === '6543' ? ' (modo transacción, el recomendado)' : u.port === '5432' && /pooler/.test(u.hostname) ? ' (modo sesión: conviene cambiar a 6543)' : ''} · usuario ${userOk ? 'con formato correcto' : 'con formato INCORRECTO (debe ser postgres.<código del proyecto>)'} · contraseña ${u.password ? 'cargada' : 'FALTA'}`;
  } catch {
    if (raw) info = 'tiene un formato inválido (revisá que no tenga espacios ni texto de más)';
  }
  lines.push(`DATABASE_URL: ${info}`);
  lines.push(`AUTH_SECRET: ${process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32 ? 'ok' : 'FALTA o es muy corta'}`);
  lines.push(`Dirección de la web: ${siteUrl()}`);
  lines.push(`Región del servidor: ${process.env.VERCEL_REGION || '-'}`);
  lines.push('');
  const t0 = Date.now();
  try {
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('la base no respondió en 12 segundos')), 12000));
    await Promise.race([sql`select 1`, timeout]);
    const t1 = Date.now();
    const [c] = (await Promise.race([sql<{ n: number }[]>`select count(*)::int as n from products`, timeout])) as { n: number }[];
    lines.push(`Base de datos: CONECTADA ✔ (${t1 - t0} ms) · ${c.n} productos (${Date.now() - t1} ms)`);
  } catch (e) {
    const err = e as { message?: string; code?: string };
    const msg = String(err.message || e).replace(/postgres(ql)?:\/\/[^\s]+/g, '[oculto]');
    lines.push(`Base de datos: ERROR ✘ después de ${Date.now() - t0} ms`);
    lines.push(`Detalle: ${err.code ? err.code + ' · ' : ''}${msg}`);
  }
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
