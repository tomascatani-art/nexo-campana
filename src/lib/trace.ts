import postgres from 'postgres';

// Registro temporal para diagnosticar dónde se traba una página (se ve en /estado/registro).
// Usa una conexión aparte, así no depende de la conexión principal.
const g = globalThis as unknown as { __nexoTraceDb?: postgres.Sql; __nexoTraceReady?: Promise<unknown>; __nexoInst?: string };
const inst = (g.__nexoInst ??= Math.random().toString(36).slice(2, 7));

function db() {
  if (!process.env.DATABASE_URL) return null;
  if (!g.__nexoTraceDb) {
    g.__nexoTraceDb = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, idle_timeout: 5, connect_timeout: 10, ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL) ? false : 'require', onnotice: () => {} });
    g.__nexoTraceReady = g.__nexoTraceDb`create table if not exists nexo_debug (at timestamptz not null default clock_timestamp(), msg text)`.catch(() => {});
  }
  return g.__nexoTraceDb;
}

export function trace(msg: string) {
  const sql = db();
  if (!sql) return;
  const line = `[${inst}] ${msg}`.slice(0, 300);
  void g.__nexoTraceReady!.then(() => sql`insert into nexo_debug (msg) values (${line})`).catch(() => {});
}

export async function readTrace() {
  const sql = db();
  if (!sql) return [];
  await g.__nexoTraceReady;
  const rows = await sql<{ at: Date; msg: string }[]>`select at, msg from nexo_debug order by at desc limit 80`;
  return rows.reverse().map((r) => `${new Date(r.at).toISOString().slice(11, 23)} ${r.msg}`);
}
