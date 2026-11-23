import 'server-only';
import type postgres from 'postgres';
import { sql } from './db';

/**
 * Pedidos que no se retiran:
 *  - Vencimiento: los pedidos para retirar se guardan X horas (panel → Negocio → Venta). Si no se
 *    entregan a tiempo pasan solos a "Vencido" y, si ya habían descontado stock, el stock vuelve.
 *  - Lista "No retiraron": el dueño marca al cliente; la próxima vez que pida se le avisa que
 *    tiene que dejar una seña, y el pedido aparece marcado en el panel.
 */

export const ACTIVE_STATUSES = ['pendiente', 'confirmado', 'preparando', 'enviado'];
const DISCOUNTS = ['confirmado', 'preparando', 'enviado', 'entregado'];
const RETURNS = ['cancelado', 'vencido'];

/** Clave para reconocer el mismo teléfono escrito de distintas formas (0, 15, +54 9…). */
export function phoneKey(phone: string) {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2);
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  d = d.replace(/^0/, '');
  if (d.length === 12) {
    for (const k of [2, 3, 4]) if (d.slice(k, k + 2) === '15') { d = d.slice(0, k) + d.slice(k + 2); break; }
  }
  return d.slice(-10);
}

// ------------------------------------------------------------------ tablas nuevas (se crean solas)
let schemaReady: Promise<void> | null = null;

/** Agrega las columnas y la tabla nuevas si la base todavía no las tiene (Vercel no corre db:setup). */
export function ensureHoldSchema() {
  schemaReady ??= (async () => {
    const [r] = await sql<{ ok: boolean }[]>`
      select to_regclass('public.no_show_customers') is not null
        and exists (select 1 from information_schema.columns where table_name = 'site_settings' and column_name = 'noshow_deposit_pct')
        and exists (select 1 from pg_constraint where conname = 'orders_status_check' and pg_get_constraintdef(oid) like '%vencido%') as ok`;
    if (r?.ok) return;
    await sql.unsafe(HOLD_SCHEMA);
  })().catch((e) => { schemaReady = null; throw e; });
  return schemaReady;
}

export const HOLD_SCHEMA = `
alter table site_settings add column if not exists order_hold_hours int not null default 48;
alter table site_settings add column if not exists noshow_deposit_pct numeric(5,2) default 20;
alter table orders add column if not exists expires_at timestamptz;
alter table orders add column if not exists needs_deposit boolean not null default false;
alter table orders add column if not exists no_show boolean not null default false;
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (status in ('pendiente','confirmado','preparando','enviado','entregado','cancelado','vencido'));
create index if not exists orders_expires on orders (expires_at) where expires_at is not null;
create table if not exists no_show_customers (
  phone_key        text primary key,
  name             text,
  phone            text not null,
  times            int not null default 1,
  last_order_code  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table no_show_customers enable row level security;
`;

// ------------------------------------------------------------------ cambio de estado (con stock)
type Tx = postgres.TransactionSql | postgres.Sql;

/**
 * Cambia el estado de un pedido dentro de una transacción. Al pasar a "confirmado" (o posterior) se
 * descuenta el stock; si se cancela o vence un pedido que ya había descontado, el stock vuelve.
 * Devuelve false si el pedido ya estaba en ese estado.
 */
export async function applyOrderStatus(tx: Tx, id: string, next: string, by: string, opts: { holdHours?: number } = {}) {
  const [o] = await tx<{ status: string; stock_applied: boolean; code: string; expires_at: Date | null; delivery_method: string; items: { product_id: string; variant_id: string | null; qty: number; unit_price: number }[] }[]>`
    select status, stock_applied, code, expires_at, delivery_method, items from orders where id = ${id} for update`;
  if (!o) throw new Error('El pedido ya no existe.');
  if (o.status === next) return { changed: false, warn: '' };
  let warn = '';
  const apply = DISCOUNTS.includes(next) && !o.stock_applied;
  const revert = RETURNS.includes(next) && o.stock_applied;
  if (apply) {
    // No se confirma un pedido si no alcanza el stock (los pedidos pendientes no reservan stock,
    // así que dos clientes pueden pedir la última unidad: el segundo no se puede confirmar).
    const need = new Map<string, { product_id: string; variant_id: string | null; qty: number }>();
    for (const it of o.items) {
      const key = `${it.product_id}:${it.variant_id ?? ''}`;
      const cur = need.get(key);
      need.set(key, { product_id: it.product_id, variant_id: it.variant_id, qty: (cur?.qty ?? 0) + it.qty });
    }
    const short: string[] = [];
    for (const n of need.values()) {
      const [p] = await tx<{ name: string; track_stock: boolean; stock: number; vname: string | null }[]>`
        select p.name, p.track_stock, coalesce(v.stock_qty, p.stock_qty) as stock, v.name as vname
        from products p left join product_variants v on v.id = ${n.variant_id} and v.product_id = p.id
        where p.id = ${n.product_id}`;
      if (p?.track_stock && p.stock < n.qty) short.push(`${p.name}${p.vname ? ` (${p.vname})` : ''}: pide ${n.qty} y hay ${Math.max(p.stock, 0)}`);
    }
    if (short.length) throw new Error(`No alcanza el stock para confirmar este pedido. ${short.join('. ')}. Si te llegó mercadería, cargala en Stock → Entrada; si no, avisale al cliente y cancelá el pedido.`);
  }
  if (apply || revert) {
    const sign = apply ? -1 : 1;
    for (const it of o.items) {
      const [p] = await tx<{ stock_qty: number; track_stock: boolean }[]>`update products set stock_qty = case when track_stock then stock_qty + ${sign * it.qty} else stock_qty end, updated_at = now() where id = ${it.product_id} returning stock_qty, track_stock`;
      if (!p) continue; // producto borrado
      if (it.variant_id && p.track_stock) await tx`update product_variants set stock_qty = stock_qty + ${sign * it.qty} where id = ${it.variant_id}`;
      if (p.track_stock && p.stock_qty < 0) warn = ' Ojo: algún producto quedó con stock negativo. Revisalo en Stock.';
      const note = `Pedido #${o.code}${revert ? (next === 'vencido' ? ' vencido (no lo retiraron)' : ' cancelado') : ''}`;
      await tx`insert into stock_movements ${tx({ product_id: it.product_id, variant_id: it.variant_id, kind: apply ? 'venta' : 'devolucion', qty: sign * it.qty, unit_price: apply ? it.unit_price : null, note, order_id: id, created_by: by })}`;
    }
  }
  // Si se reactiva un pedido vencido, se le da otra vez el plazo completo para retirarlo.
  const reopen = ACTIVE_STATUSES.includes(next) && o.delivery_method === 'retiro' && o.expires_at && new Date(o.expires_at).getTime() < Date.now() && (opts.holdHours ?? 0) > 0;
  await tx`update orders set status = ${next}, stock_applied = ${apply ? true : revert ? false : o.stock_applied}, updated_at = now(),
    ${reopen ? tx`expires_at = now() + make_interval(hours => ${opts.holdHours!}),` : tx``}
    history = history || ${tx.json([{ status: next, at: new Date().toISOString(), by }])}::jsonb where id = ${id}`;
  return { changed: true, warn };
}

// ------------------------------------------------------------------ vencimiento automático
let lastRun = 0;
let running: Promise<number> | null = null;

/**
 * Pasa a "Vencido" los pedidos para retirar cuyo plazo terminó (y devuelve el stock si hacía falta).
 * Se llama al abrir el panel, al entrar a la web y al hacer un pedido; corre como mucho una vez por minuto.
 * Si ya está corriendo, se espera a que termine (así la lista de pedidos no muestra datos viejos).
 */
export function expireDueOrders(force = false): Promise<number> {
  if (running) return running;
  if (!force && Date.now() - lastRun < 60_000) return Promise.resolve(0);
  lastRun = Date.now();
  running = (async () => {
    try {
      await ensureHoldSchema();
      const due = await sql<{ id: string }[]>`
        select id from orders where expires_at < now() and delivery_method = 'retiro' and status in ('pendiente','confirmado','preparando','enviado')
        order by expires_at limit 50`;
      for (const { id } of due) {
        await sql.begin(async (tx) => {
          const [o] = await tx<{ ok: boolean }[]>`select (expires_at < now() and status in ('pendiente','confirmado','preparando','enviado')) as ok from orders where id = ${id} for update`;
          if (o?.ok) await applyOrderStatus(tx, id, 'vencido', 'automático (no lo retiraron a tiempo)');
        });
      }
      return due.length;
    } catch (e) {
      console.error('expireDueOrders', e);
      lastRun = 0;
      return 0;
    } finally {
      running = null;
    }
  })();
  return running;
}

// ------------------------------------------------------------------ lista "No retiraron"
export type NoShow = { phone_key: string; name: string | null; phone: string; times: number; last_order_code: string | null; created_at: string; updated_at: string };

export async function getNoShows() {
  await ensureHoldSchema();
  return sql<NoShow[]>`select * from no_show_customers order by updated_at desc`;
}

export async function findNoShow(phone: string) {
  await ensureHoldSchema();
  const [r] = await sql<NoShow[]>`select * from no_show_customers where phone_key = ${phoneKey(phone)}`;
  return r ?? null;
}
