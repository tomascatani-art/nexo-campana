import 'server-only';
import { sql } from './db';

// Una sola vez: borra los números de stock de ejemplo para que el dueño arranque de cero.
// Los productos NO se tocan (siguen publicados y se pueden pedir): quedan en "sin controlar
// stock" hasta que el dueño cargue una entrada o un conteo, y ahí se activa solo.
// Queda anotado en app_flags, así no se repite nunca más.
const FLAG = 'stock_en_cero_2026_11';
const g = globalThis as unknown as { __stockReset?: Promise<void> };

async function run() {
  if (process.env.NEXO_DEMO === '1') return; // la demo local conserva los números de ejemplo
  await sql.unsafe(`create table if not exists app_flags (key text primary key, done_at timestamptz not null default now())`);
  await sql.unsafe(`alter table app_flags enable row level security`);
  const [done] = await sql<{ key: string }[]>`select key from app_flags where key = ${FLAG}`;
  if (done) return;
  await sql.begin(async (tx) => {
    const ins = await tx`insert into app_flags (key) values (${FLAG}) on conflict do nothing returning key`;
    if (!ins.length) return; // otra instancia ya lo hizo
    await tx`delete from stock_movements`;
    await tx`update product_variants set stock_qty = 0`;
    await tx`update products set stock_qty = 0, track_stock = false`;
    await tx`update orders set stock_applied = false`;
  });
}

export function ensureStockReset(): Promise<void> {
  if (!g.__stockReset) {
    g.__stockReset = run().catch((e) => {
      g.__stockReset = undefined;
      throw e;
    });
  }
  return g.__stockReset;
}
