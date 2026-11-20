import 'server-only';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta la variable de entorno DATABASE_URL');

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

/**
 * Lee las fechas que manda Postgres sin romperse aunque el servidor use otro
 * formato de fecha (DateStyle). Si no se entiende, devuelve null en vez de una
 * fecha inválida que haga fallar la página.
 */
function parsePgDate(x: string): Date | null {
  const d = new Date(x);
  if (Number.isFinite(d.getTime())) return d;
  // formatos "SQL, DMY" (19/11/2026 03:00:00) y "German" (19.11.2026 03:00:00)
  const m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?\s*(.*)$/.exec(x.trim());
  if (m) {
    const [, a, b, y, hh = '00', mm = '00', ss = '00', frac = '0', tz] = m;
    const [day, month] = Number(a) > 12 ? [a, b] : Number(b) > 12 ? [b, a] : [a, b];
    const zone = !tz || /^(UTC|GMT)$/i.test(tz) ? 'Z' : /^[+-]\d{2}(:?\d{2})?$/.test(tz) ? (tz.length === 3 ? `${tz}:00` : tz) : 'Z';
    const iso = `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hh}:${mm}:${ss}.${frac.slice(0, 3).padEnd(3, '0')}${zone}`;
    const d2 = new Date(iso);
    if (Number.isFinite(d2.getTime())) return d2;
  }
  return null;
}

const globalForDb = globalThis as unknown as { __sql?: postgres.Sql };

export const sql =
  globalForDb.__sql ??
  postgres(url, {
    prepare: false, // compatible con el pooler de Supabase (modo transacción)
    // Una consulta a la vez por conexión: el pooler de Supabase (modo transacción) a veces deja
    // colgadas las consultas "en fila" (pipelining) y la página quedaba cargando para siempre.
    ...({ max_pipeline: 0 } as object), // opción válida de postgres.js que falta en sus tipos
    max: Number(process.env.DB_MAX) || (isLocal ? 10 : 3),
    idle_timeout: process.env.VERCEL ? 5 : 20, // en Vercel no dejar conexiones colgadas
    connect_timeout: 10,
    ssl: isLocal ? false : 'require',
    onnotice: () => {},
    types: {
      // date, timestamp, timestamptz
      fecha: { to: 1184, from: [1082, 1114, 1184], serialize: (x: Date | string) => (x instanceof Date ? x.toISOString() : x), parse: parsePgDate },
    },
  });

/**
 * Transacciones: como cada conexión hace una consulta a la vez (max_pipeline 0), el sql.begin
 * original de postgres.js no reconoce la conexión y tira "UNSAFE_TRANSACTION". Esta versión
 * reserva una conexión, hace BEGIN / COMMIT (o ROLLBACK si algo falla) y la libera.
 */
if (!(sql as unknown as { __safeBegin?: boolean }).__safeBegin) {
  const safeBegin = async (...args: unknown[]) => {
    const fn = args[args.length - 1] as (tx: unknown) => unknown;
    const mode = args.length > 1 && typeof args[0] === 'string' ? ` ${args[0].replace(/[^a-z ]/gi, '')}` : '';
    const tx = await sql.reserve();
    try {
      await tx.unsafe(`begin${mode}`);
      try {
        const out = fn(tx);
        const result = await (Array.isArray(out) ? Promise.all(out) : out);
        await tx`commit`;
        return result;
      } catch (e) {
        await tx`rollback`.catch(() => {});
        throw e;
      }
    } finally {
      tx.release();
    }
  };
  Object.assign(sql, { begin: safeBegin, __safeBegin: true });
}

if (process.env.NODE_ENV !== 'production') globalForDb.__sql = sql;
