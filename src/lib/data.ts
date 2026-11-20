import 'server-only';
import { cache } from 'react';
import { sql } from './db';
import { safeIso, stockState } from './format';
import { offerActive } from './pricing';
import type { Category, Hours, Review, SpecialDay, WaitlistEntry, Movement, Order, Product, PublicProduct, Settings, Variant } from './types';

export const getSettings = cache(async (): Promise<Settings> => {
  const [s] = await sql<Settings[]>`select *, shipping_cost::float8 as shipping_cost, free_shipping_from::float8 as free_shipping_from, min_order_total::float8 as min_order_total, cash_discount_pct::float8 as cash_discount_pct, transfer_surcharge_pct::float8 as transfer_surcharge_pct, usd_rate::float8 as usd_rate from site_settings where id = 1`;
  if (!s) throw new Error('La base de datos no tiene configuración. Ejecutá "npm run db:setup".');
  // Columnas nuevas (pueden no existir todavía en una base vieja: se crean solas al primer pedido / al abrir el panel)
  s.order_hold_hours = s.order_hold_hours ?? 48;
  s.noshow_deposit_pct = s.noshow_deposit_pct == null ? 20 : Number(s.noshow_deposit_pct);
  return s;
});

export const getHours = cache(async (): Promise<Hours[]> => sql<Hours[]>`
  select day_of_week, is_open,
    to_char(open1, 'HH24:MI') as open1, to_char(close1, 'HH24:MI') as close1,
    to_char(open2, 'HH24:MI') as open2, to_char(close2, 'HH24:MI') as close2
  from opening_hours order by day_of_week`);

/** Feriados y días especiales de hoy en adelante (los pasados se ocultan solos). */
export const getSpecialDays = cache(async (): Promise<SpecialDay[]> => sql<SpecialDay[]>`
  select id, to_char(day, 'YYYY-MM-DD') as day, is_open, reason,
    to_char(open1, 'HH24:MI') as open1, to_char(close1, 'HH24:MI') as close1,
    to_char(open2, 'HH24:MI') as open2, to_char(close2, 'HH24:MI') as close2
  from special_days where day >= (now() at time zone 'America/Argentina/Buenos_Aires')::date
  order by day`);

export async function getWaitlist() {
  return sql<WaitlistEntry[]>`select id, name, phone, notified_at, created_at from shipping_waitlist order by notified_at nulls first, created_at desc`;
}

export async function getCategories(opts: { onlyActive?: boolean } = {}) {
  return sql<Category[]>`
    select c.*, c.transfer_surcharge_pct::float8 as transfer_surcharge_pct, (select count(*)::int from products p where p.category_id = c.id and p.active) as product_count
    from categories c ${opts.onlyActive ? sql`where c.active` : sql``}
    order by c.sort_order, c.name`;
}

const productCols = sql`
  p.*, p.price::float8 as price, p.old_price::float8 as old_price, p.bulk_price::float8 as bulk_price, p.cost::float8 as cost, p.offer_price::float8 as offer_price,
  c.name as category_name, c.slug as category_slug,
  coalesce((select json_agg(json_build_object('id', v.id, 'product_id', v.product_id, 'name', v.name, 'sku', v.sku, 'price', v.price::float8, 'stock_qty', v.stock_qty, 'active', v.active, 'sort_order', v.sort_order) order by v.sort_order, v.name)
    from product_variants v where v.product_id = p.id), '[]') as variants,
  coalesce((select -sum(m.qty)::int from stock_movements m where m.product_id = p.id and m.kind = 'venta' and m.created_at > now() - interval '30 days'), 0) as sold_30d`;

export async function getProducts(opts: { search?: string; categoryId?: string; filter?: string } = {}) {
  const q = opts.search?.trim();
  return sql<Product[]>`
    select ${productCols} from products p left join categories c on c.id = p.category_id
    where true
      ${q ? sql`and (p.name ilike ${'%' + q + '%'} or p.sku ilike ${'%' + q + '%'})` : sql``}
      ${opts.categoryId ? sql`and p.category_id = ${opts.categoryId}` : sql``}
      ${opts.filter === 'bajo' ? sql`and p.track_stock and p.stock_qty > 0 and p.stock_qty <= p.min_stock` : sql``}
      ${opts.filter === 'sin' ? sql`and p.track_stock and p.stock_qty <= 0` : sql``}
      ${opts.filter === 'ocultos' ? sql`and not p.active` : sql``}
      ${opts.filter === 'sin-compartir' ? sql`and p.active and p.shared_at is null` : sql``}
    order by p.created_at desc`;
}

export async function getProduct(id: string) {
  const [p] = await sql<Product[]>`select ${productCols} from products p left join categories c on c.id = p.category_id where p.id = ${id}`;
  return p ?? null;
}

/** Productos visibles para el público, ya "limpios" (sin costo ni stock exacto). */
export const getPublicProducts = cache(async (): Promise<PublicProduct[]> => {
  const s = await getSettings();
  const rows = await sql<Product[]>`
    select ${productCols} from products p left join categories c on c.id = p.category_id
    where p.active and (c.id is null or c.active)
    order by p.featured desc, p.sort_order, p.created_at desc`;
  // "Más vendido": los 3 productos con más ventas en los últimos 30 días
  const top = new Set([...rows].filter((r) => (r.sold_30d ?? 0) > 0).sort((a, b) => (b.sold_30d ?? 0) - (a.sold_30d ?? 0)).slice(0, 3).map((r) => r.id));
  return rows
    .map((p) => toPublic(p, s, top))
    .filter((p): p is PublicProduct => !!p);
});

function toPublic(p: Product, s: Settings, top: Set<string>): PublicProduct | null {
  const vs = (p.variants ?? []).filter((v) => v.active);
  const hasVariants = !!p.variant_label && vs.length > 0;
  const st = stockState(p);
  if (st === 'out' && s.hide_out_of_stock) return null;
  const promo = s.promos_enabled;
  const offer = promo && offerActive(p) && p.price != null && p.offer_price! < p.price;
  return {
    id: p.id, slug: p.slug, name: p.name, category_slug: p.category_slug, category_name: p.category_name,
    description: p.description, image_id: p.image_id, gallery: p.gallery ?? [], price: offer ? p.offer_price : p.price, old_price: offer ? Math.max(p.price!, p.old_price ?? 0) : promo ? p.old_price : null,
    unit_label: p.unit_label,
    // con la oferta vigente, el precio mayorista solo se muestra si sigue siendo más barato
    ...(promo && p.bulk_price != null && !(offer && p.bulk_price >= p.offer_price!) ? { bulk_qty: p.bulk_qty, bulk_price: p.bulk_price } : { bulk_qty: null, bulk_price: null }),
    variant_label: hasVariants ? p.variant_label : null,
    variants: hasVariants ? vs.map((v: Variant) => ({ id: v.id, name: v.name, price: v.price, available: !p.track_stock || v.stock_qty > 0, max_qty: p.track_stock ? Math.max(0, v.stock_qty) : null })) : [],
    sold_30d: p.sold_30d ?? 0,
    is_new: p.is_new && Date.now() - new Date(safeIso(p.created_at)).getTime() < 21 * 864e5,
    featured: p.featured,
    best_seller: top.has(p.id),
    availability: st === 'out' ? 'out' : st === 'low' && s.show_stock_left ? 'low' : 'ok',
    max_qty: p.track_stock ? Math.max(0, p.stock_qty) : null,
    created_at: safeIso(p.created_at),
    offer_until: offer && p.offer_until ? safeIso(p.offer_until, null) : null,
  };
}

export async function getPublicProductBySlug(slug: string) {
  const all = await getPublicProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getPublicData() {
  const [settings, hours, categories, products, specials, reviews] = await Promise.all([getSettings(), getHours(), getCategories({ onlyActive: true }), getPublicProducts(), getSpecialDays(), getPublishedReviews()]);
  return { settings, hours, specials, reviews, categories: categories.filter((c) => products.some((p) => p.category_slug === c.slug)), products };
}

// ------------------------------------------------------------------ tablero
export async function getDashboard() {
  const [[kpi], [sales], lowStock, recentMoves, top, [orders], unshared, daily] = await Promise.all([
    sql<{ active: number; hidden: number; units: number; value_price: number; value_cost: number; low: number; out: number }[]>`
      select count(*) filter (where active)::int as active,
             count(*) filter (where not active)::int as hidden,
             coalesce(sum(greatest(stock_qty,0)) filter (where track_stock), 0)::int as units,
             coalesce(sum(greatest(stock_qty,0) * price) filter (where track_stock), 0)::float8 as value_price,
             coalesce(sum(greatest(stock_qty,0) * cost) filter (where track_stock), 0)::float8 as value_cost,
             count(*) filter (where track_stock and stock_qty > 0 and stock_qty <= min_stock and active)::int as low,
             count(*) filter (where track_stock and stock_qty <= 0 and active)::int as out
      from products`,
    sql<{ today: number; units_today: number; month: number; all_time: number; units7: number; total7: number; units30: number; total30: number; total_prev30: number }[]>`
      select coalesce(sum(-qty * unit_price) filter (where (created_at at time zone 'America/Argentina/Buenos_Aires')::date = (now() at time zone 'America/Argentina/Buenos_Aires')::date), 0)::float8 as today,
             coalesce(-sum(qty) filter (where (created_at at time zone 'America/Argentina/Buenos_Aires')::date = (now() at time zone 'America/Argentina/Buenos_Aires')::date), 0)::int as units_today,
             coalesce(sum(-qty * unit_price) filter (where date_trunc('month', created_at at time zone 'America/Argentina/Buenos_Aires') = date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')), 0)::float8 as month,
             coalesce(sum(-qty * unit_price), 0)::float8 as all_time,
             coalesce(-sum(qty) filter (where created_at > now() - interval '7 days'), 0)::int as units7,
             coalesce(sum(-qty * unit_price) filter (where created_at > now() - interval '7 days'), 0)::float8 as total7,
             coalesce(-sum(qty) filter (where created_at > now() - interval '30 days'), 0)::int as units30,
             coalesce(sum(-qty * unit_price) filter (where created_at > now() - interval '30 days'), 0)::float8 as total30,
             coalesce(sum(-qty * unit_price) filter (where created_at between now() - interval '60 days' and now() - interval '30 days'), 0)::float8 as total_prev30
      from stock_movements where kind = 'venta'`,
    sql<Product[]>`select ${productCols} from products p left join categories c on c.id = p.category_id
      where p.active and p.track_stock and p.stock_qty <= p.min_stock order by p.stock_qty, p.name limit 8`,
    getMovements({ limit: 8 }),
    sql<{ id: string; name: string; image_id: string | null; units: number; total: number }[]>`
      select p.id, p.name, p.image_id, -sum(m.qty)::int as units, sum(-m.qty * m.unit_price)::float8 as total
      from stock_movements m join products p on p.id = m.product_id
      where m.kind = 'venta' and m.created_at > now() - interval '30 days'
      group by p.id order by units desc limit 5`,
    sql<{ nuevos: number; activos: number; mes: number; total: number; hoy: number }[]>`select count(*) filter (where status = 'pendiente')::int as nuevos,
      count(*) filter (where (created_at at time zone 'America/Argentina/Buenos_Aires')::date = (now() at time zone 'America/Argentina/Buenos_Aires')::date)::int as hoy,
      count(*) filter (where status in ('confirmado','preparando','enviado'))::int as activos,
      count(*) filter (where created_at > date_trunc('month', now()))::int as mes, count(*)::int as total from orders`,
    sql<{ n: number }[]>`select count(*)::int as n from products where active and shared_at is null`,
    sql<{ day: string; total: number }[]>`
      select to_char(d, 'YYYY-MM-DD') as day,
        coalesce((select sum(-qty * unit_price) from stock_movements m where m.kind = 'venta'
          and (m.created_at at time zone 'America/Argentina/Buenos_Aires')::date = d), 0)::float8 as total
      from generate_series((now() at time zone 'America/Argentina/Buenos_Aires')::date - 13, (now() at time zone 'America/Argentina/Buenos_Aires')::date, '1 day') d
      order by d`,
  ]);
  return { kpi, sales, lowStock, recentMoves, top, newOrders: orders.nuevos, orders, unshared: unshared[0].n, daily };
}

export async function getMovements(opts: { productId?: string; limit?: number; kind?: string } = {}) {
  return sql<Movement[]>`
    select m.*, m.unit_price::float8 as unit_price, p.name as product_name, p.image_id, v.name as variant_name
    from stock_movements m join products p on p.id = m.product_id left join product_variants v on v.id = m.variant_id
    where true
      ${opts.productId ? sql`and m.product_id = ${opts.productId}` : sql``}
      ${opts.kind ? sql`and m.kind = ${opts.kind}` : sql``}
    order by m.created_at desc limit ${opts.limit ?? 100}`;
}

const orderCols = sql`*, subtotal::float8 as subtotal, shipping_cost::float8 as shipping_cost, total::float8 as total, discount::float8 as discount, surcharge::float8 as surcharge, usd_rate::float8 as usd_rate`;

export async function getOrders(opts: { status?: string; search?: string } = {}) {
  const q = opts.search?.trim();
  return sql<Order[]>`
    select ${orderCols} from orders
    where true
      ${opts.status === 'activos' ? sql`and status in ('pendiente','confirmado','preparando','enviado')` : opts.status ? sql`and status = ${opts.status}` : sql``}
      ${q ? sql`and (code = ${q.replace('#', '')} or customer_name ilike ${'%' + q + '%'} or customer_phone ilike ${'%' + q + '%'})` : sql``}
    order by created_at desc limit 200`;
}

export async function getOrder(id: string) {
  const [o] = await sql<Order[]>`select ${orderCols} from orders where id = ${id}`;
  return o ?? null;
}

// ------------------------------------------------------------------ estadísticas y clientes
export type ProductStat = { id: string; name: string; image_id: string | null; active: boolean; views: number; adds: number; ordered: number; sold: number };

/** Por producto, últimos N días: visitas, agregados a la lista, unidades pedidas por la web y vendidas (stock). */
export async function getProductStats(days = 30) {
  return sql<ProductStat[]>`
    with o as (
      select (i->>'product_id')::uuid as product_id, sum((i->>'qty')::int)::int as ordered
      from orders, jsonb_array_elements(items) i
      where status not in ('cancelado', 'vencido') and created_at > now() - make_interval(days => ${days})
      group by 1
    ), st as (
      select product_id, sum(views)::int as views, sum(adds)::int as adds from product_stats
      where day > (now() at time zone 'America/Argentina/Buenos_Aires')::date - ${days}::int group by 1
    ), v as (
      select product_id, -sum(qty)::int as sold from stock_movements where kind = 'venta' and created_at > now() - make_interval(days => ${days}) group by 1
    )
    select p.id, p.name, p.image_id, p.active, coalesce(st.views, 0) as views, coalesce(st.adds, 0) as adds,
      coalesce(o.ordered, 0) as ordered, coalesce(v.sold, 0) as sold
    from products p left join st on st.product_id = p.id left join o on o.product_id = p.id left join v on v.product_id = p.id
    order by coalesce(st.views, 0) desc, p.name`;
}

export type Customer = { phone_digits: string; name: string; phone: string; orders: number; total: number; last_at: string; first_at: string };

export async function getCustomers() {
  return sql<Customer[]>`
    select regexp_replace(customer_phone, '\\D', '', 'g') as phone_digits,
      (array_agg(customer_name order by created_at desc))[1] as name,
      (array_agg(customer_phone order by created_at desc))[1] as phone,
      count(*)::int as orders, coalesce(sum(total), 0)::float8 as total,
      max(created_at) as last_at, min(created_at) as first_at
    from orders where status not in ('cancelado', 'vencido')
    group by 1 order by sum(total) desc nulls last, count(*) desc limit 500`;
}

// ------------------------------------------------------------------ opiniones
export const getPublishedReviews = cache(async () => {
  const [list, [agg]] = await Promise.all([
    sql<Review[]>`select id, name, rating, text, status, created_at from reviews where status = 'publicada' order by created_at desc limit 12`,
    sql<{ avg: number | null; n: number }[]>`select round(avg(rating)::numeric, 1)::float8 as avg, count(*)::int as n from reviews where status = 'publicada'`,
  ]);
  return { list, avg: agg?.avg ?? null, count: agg?.n ?? 0 };
});

export async function getAllReviews() {
  return sql<Review[]>`select id, name, rating, text, status, created_at from reviews order by (status = 'pendiente') desc, created_at desc limit 300`;
}
