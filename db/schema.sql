-- =====================================================================
-- NEXO CAMPANA – Esquema de base de datos (PostgreSQL / Supabase)
-- Es idempotente: se puede ejecutar varias veces sin perder datos.
-- =====================================================================
-- gen_random_uuid() viene incluido en PostgreSQL 13+ (Supabase, Neon, etc.)

-- Imágenes (se guardan optimizadas en WebP dentro de la base)
create table if not exists images (
  id          uuid primary key default gen_random_uuid(),
  data        bytea not null,
  mime        text not null default 'image/webp',
  width       int,
  height      int,
  size_bytes  int,
  created_at  timestamptz not null default now()
);

-- Datos generales del negocio (una sola fila, id = 1)
create table if not exists site_settings (
  id                 int primary key default 1 check (id = 1),
  business_name      text not null default 'NEXO Campana',
  business_kind      text not null default 'Mayorista y minorista',
  slogan             text,
  tagline            text,
  hero_title         text,
  hero_subtitle      text,
  hero_image_id      uuid references images(id) on delete set null,
  logo_image_id      uuid references images(id) on delete set null,
  about_title        text,
  about_text         text,
  about_image_id     uuid references images(id) on delete set null,
  whatsapp_number    text,           -- formato internacional sin + (ej: 5493489123456)
  channel_url        text,           -- enlace del canal de WhatsApp
  phone              text,
  email              text,
  address            text,
  city               text,
  province           text,
  postal_code        text,
  maps_query         text,
  instagram_url      text,
  facebook_url       text,
  tiktok_url         text,
  price_note         text,           -- aviso debajo de los precios
  list_note          text,           -- aviso en la lista de compras
  share_footer       text,           -- texto que se agrega al compartir en el canal
  announcement_text  text,           -- barra de anuncio arriba de la web
  announcement_on    boolean not null default false,
  promos_enabled     boolean not null default true,  -- mostrar ofertas (precios tachados)
  pickup_enabled     boolean not null default true,  -- retiro en el local
  shipping_enabled   boolean not null default false, -- envío a domicilio
  shipping_cost      numeric(12,2),                  -- costo fijo de envío (vacío = a convenir)
  free_shipping_from numeric(12,2),                  -- envío gratis desde
  shipping_info      text,                           -- zonas / condiciones de envío
  payment_methods    text[] not null default '{efectivo,transferencia}',
  transfer_info      text,                           -- alias / CBU para transferencias
  min_order_total    numeric(12,2),                  -- compra mínima (opcional)
  hide_out_of_stock  boolean not null default false, -- ocultar productos sin stock (si no: "Sin stock")
  show_stock_left    boolean not null default true,  -- mostrar "¡Últimas unidades!" 
  seo_title          text,
  seo_description    text,
  site_url           text,
  updated_at         timestamptz not null default now()
);

-- Horarios de atención (0 = domingo … 6 = sábado). Dos turnos por día.
create table if not exists opening_hours (
  day_of_week  int primary key check (day_of_week between 0 and 6),
  is_open      boolean not null default true,
  open1        time,
  close1       time,
  open2        time,
  close2       time
);

-- Categorías del catálogo
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  icon        text not null default 'package',
  image_id    uuid references images(id) on delete set null,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Productos
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  category_id  uuid references categories(id) on delete set null,
  description  text,
  image_id     uuid references images(id) on delete set null,
  gallery      uuid[] not null default '{}',   -- fotos extra
  price        numeric(12,2),
  old_price    numeric(12,2),                  -- precio anterior (se muestra tachado = oferta)
  unit_label   text,                           -- ej: "c/u", "x caja de 6"
  bulk_qty     int,                            -- precio mayorista: desde X unidades…
  bulk_price   numeric(12,2),                  -- …cada una sale este precio
  sku          text,                           -- código interno (opcional)
  cost         numeric(12,2),                  -- costo (solo lo ve el dueño)
  track_stock  boolean not null default true,  -- controlar stock de este producto
  stock_qty    int not null default 0,         -- si tiene variantes, es la suma de las variantes
  min_stock    int not null default 2,         -- alerta de "stock bajo" al llegar a este número
  variant_label text,                          -- ej: "Color", "Talle", "Modelo" (vacío = sin variantes)
  is_new       boolean not null default true,
  active       boolean not null default true,
  featured     boolean not null default false,
  sort_order   int not null default 0,
  shared_at    timestamptz,                    -- última vez que se compartió en el canal
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Publicación para el canal de WhatsApp (opcionales; vacío = texto automático según la categoría)
alter table products add column if not exists share_hook text;      -- frase gancho: "🍳🔥 ¡COCINÁ FÁCIL Y RICO! 🤩"
alter table products add column if not exists share_features text;  -- una característica por línea (salen con ✅)
alter table products add column if not exists share_closing text;   -- cierre: "🛒😍 ¡Hacé tu pedido…!"
create index if not exists products_category on products (category_id);
create index if not exists products_created on products (created_at desc);

-- Variantes (talle, color, modelo…) con stock y precio propios
create table if not exists product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  name        text not null,                   -- ej: "Rojo", "XL", "220V"
  sku         text,
  price       numeric(12,2),                   -- vacío = usa el precio del producto
  stock_qty   int not null default 0,
  active      boolean not null default true,
  sort_order  int not null default 0
);
create index if not exists product_variants_product on product_variants (product_id, sort_order);

-- Movimientos de stock (entradas de mercadería, ventas, ajustes)
create table if not exists stock_movements (
  id          bigserial primary key,
  product_id  uuid not null references products(id) on delete cascade,
  variant_id  uuid references product_variants(id) on delete set null,
  kind        text not null check (kind in ('entrada','venta','ajuste','devolucion')),
  qty         int not null,                    -- con signo: + entra, - sale
  unit_price  numeric(12,2),                   -- precio de venta (en ventas)
  note        text,
  order_id    uuid,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists stock_movements_product on stock_movements (product_id, created_at desc);
create index if not exists stock_movements_time on stock_movements (created_at desc);

-- Pedidos que hacen los clientes desde la web (se envían por WhatsApp; el pago se coordina aparte)
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,          -- número corto, ej: 4821
  customer_name    text not null,
  customer_phone   text not null,
  customer_note    text,
  delivery_method  text not null default 'retiro' check (delivery_method in ('retiro','envio')),
  address          text,                          -- si es envío
  payment_method   text,
  items            jsonb not null,                -- [{product_id,variant_id,name,variant,qty,unit_price,subtotal}]
  subtotal         numeric(12,2) not null,
  shipping_cost    numeric(12,2),
  total            numeric(12,2) not null,
  status           text not null default 'pendiente' check (status in ('pendiente','confirmado','preparando','enviado','entregado','cancelado')),
  stock_applied    boolean not null default false, -- el stock ya se descontó
  history          jsonb not null default '[]',   -- [{status, at, by}]
  admin_note       text,
  payment_status   text not null default 'pendiente' check (payment_status in ('pendiente','pagado')),
  payment_ref      text,                          -- para Mercado Pago u otros (futuro)
  ip               text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_time on orders (created_at desc);

-- Usuarios administradores
create table if not exists admin_users (
  id              uuid primary key default gen_random_uuid(),
  username        text not null unique,
  display_name    text,
  password_hash   text not null,
  session_version int not null default 1,
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz
);

-- Registro de intentos de acceso (protección contra fuerza bruta)
create table if not exists login_attempts (
  id          bigserial primary key,
  ip          text not null,
  username    text,
  success     boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists login_attempts_ip_time on login_attempts (ip, created_at desc);

-- -------------------------------------------------------------------
-- Seguridad para Supabase: RLS activado SIN políticas en todas las
-- tablas. La API pública de Supabase (clave "anon") no puede leer ni
-- modificar nada. La web accede solo desde el servidor (DATABASE_URL).
-- -------------------------------------------------------------------
alter table images         enable row level security;
alter table site_settings  enable row level security;
alter table opening_hours  enable row level security;
alter table categories     enable row level security;
alter table products       enable row level security;
alter table admin_users    enable row level security;
alter table login_attempts enable row level security;
alter table stock_movements enable row level security;
alter table orders         enable row level security;
alter table product_variants enable row level security;

-- ---------------------------------------------------------------- envíos
-- Modo de envíos: 'off' (no se muestra nada), 'proximamente' (cartel + lista de interesados), 'activo'
alter table site_settings add column if not exists shipping_mode text not null default 'activo';
alter table site_settings add column if not exists shipping_zones jsonb not null default '[]';   -- [{ "name": "Campana", "cost": 3500 }]
alter table site_settings add column if not exists shipping_soon_text text;
update site_settings set shipping_mode = 'off' where shipping_mode = 'activo' and not shipping_enabled;
alter table orders add column if not exists shipping_zone text;
alter table site_settings add column if not exists quick_replies jsonb;  -- [{ title, text }] (vacío = las de fábrica)

-- Clientes que pidieron que les avisen cuando haya envíos
create table if not exists shipping_waitlist (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  phone       text not null,
  phone_digits text not null unique,
  ip          text,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);
alter table shipping_waitlist enable row level security;

-- ---------------------------------------------------------------- días especiales (feriados, cierres, horario reducido)
create table if not exists special_days (
  id      uuid primary key default gen_random_uuid(),
  day     date not null unique,
  is_open boolean not null default false,
  open1   time,
  close1  time,
  open2   time,
  close2  time,
  reason  text not null default 'Feriado',
  created_at timestamptz not null default now()
);
alter table special_days enable row level security;

-- ---------------------------------------------------------------- estadísticas simples (visitas y "agregar al carrito" por día)
create table if not exists product_stats (
  product_id uuid not null references products(id) on delete cascade,
  day        date not null,
  views      int not null default 0,
  adds       int not null default 0,
  primary key (product_id, day)
);
alter table product_stats enable row level security;

-- Descuento pagando en efectivo (0 / vacío = sin descuento)
alter table site_settings add column if not exists cash_discount_pct numeric(5,2);
alter table orders add column if not exists discount numeric(12,2);

-- Ofertas programadas: precio de oferta que se activa y se termina solo
alter table products add column if not exists offer_price numeric(12,2);
alter table products add column if not exists offer_from timestamptz;
alter table products add column if not exists offer_until timestamptz;

-- Opiniones de clientes (se publican solo cuando el dueño las aprueba)
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rating      int not null check (rating between 1 and 5),
  text        text not null,
  status      text not null default 'pendiente' check (status in ('pendiente', 'publicada', 'oculta')),
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_status on reviews (status, created_at desc);
alter table reviews enable row level security;

-- Video de entrada de la portada
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  data        bytea not null default '',
  mime        text not null,
  size_bytes  int not null default 0,
  complete    boolean not null default false,  -- se sube en partes; true al terminar
  created_at  timestamptz not null default now()
);
alter table media alter column data set storage external;  -- permite leer pedazos (Range) sin descomprimir todo
alter table media enable row level security;
alter table site_settings add column if not exists hero_video_on boolean not null default true;
alter table site_settings add column if not exists hero_video_id uuid references media(id) on delete set null;  -- vacío = video incluido en la web
alter table site_settings add column if not exists hero_poster_id uuid references images(id) on delete set null;
alter table site_settings add column if not exists hero_welcome text default 'Bienvenidos';  -- vacío = sin cartel

-- Políticas del local: recargo por transferencia, dólares, avisos
alter table site_settings add column if not exists transfer_surcharge_pct numeric(5,2);           -- recargo general por transferencia (ej: 5)
alter table categories    add column if not exists transfer_surcharge_pct numeric(5,2);           -- recargo propio de la categoría (ej: Celulares 10)
alter table site_settings add column if not exists transfer_info_public boolean not null default false; -- mostrar el alias en la web (NEXO: no)
alter table site_settings add column if not exists transfer_notice text;   -- "Pedí el alias antes de transferir…"
alter table site_settings add column if not exists refund_policy text;     -- "El dinero no se devuelve…"
alter table site_settings add column if not exists admission_notice text default 'Nos reservamos el derecho de admisión y permanencia.'; -- vacío = no se muestra
alter table site_settings add column if not exists usd_rate numeric(12,2); -- cotización del dólar del día (vacío = no se muestra)
alter table site_settings add column if not exists usd_rate_at timestamptz;
alter table site_settings add column if not exists greeting_template text; -- plantilla "Saludo del día" para el canal
alter table orders add column if not exists surcharge numeric(12,2);
alter table orders add column if not exists usd_rate numeric(12,2);
