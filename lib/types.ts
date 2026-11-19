export type Settings = {
  id: number;
  business_name: string;
  business_kind: string;
  slogan: string | null;
  tagline: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_id: string | null;
  logo_image_id: string | null;
  about_title: string | null;
  about_text: string | null;
  about_image_id: string | null;
  whatsapp_number: string | null;
  channel_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  maps_query: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  price_note: string | null;
  list_note: string | null;
  share_footer: string | null;
  announcement_text: string | null;
  announcement_on: boolean;
  promos_enabled: boolean;
  pickup_enabled: boolean;
  shipping_enabled: boolean;
  shipping_cost: number | null;
  free_shipping_from: number | null;
  shipping_info: string | null;
  shipping_mode: ShippingMode;
  shipping_zones: ShippingZone[];
  shipping_soon_text: string | null;
  quick_replies: { title: string; text: string }[] | null;
  cash_discount_pct: number | null;
  hero_video_on: boolean;
  hero_video_id: string | null;
  hero_poster_id: string | null;
  hero_welcome: string | null;
  transfer_surcharge_pct: number | null;
  transfer_info_public: boolean;
  transfer_notice: string | null;
  refund_policy: string | null;
  admission_notice: string | null;
  usd_rate: number | null;
  usd_rate_at: string | null;
  greeting_template: string | null;
  payment_methods: string[];
  transfer_info: string | null;
  min_order_total: number | null;
  hide_out_of_stock: boolean;
  show_stock_left: boolean;
  seo_title: string | null;
  seo_description: string | null;
  site_url: string | null;
  updated_at: string;
};

export type ShippingMode = 'off' | 'proximamente' | 'activo';
export type ShippingZone = { name: string; cost: number | null };
export const SHIPPING_SOON_DEFAULT = '🚚 Envíos a domicilio: ¡próximamente!';
export type WaitlistEntry = { id: string; name: string | null; phone: string; notified_at: string | null; created_at: string };
export type SpecialDay = { id: string; day: string; is_open: boolean; open1: string | null; close1: string | null; open2: string | null; close2: string | null; reason: string };

export type Hours = { day_of_week: number; is_open: boolean; open1: string | null; close1: string | null; open2: string | null; close2: string | null };

export type Category = { id: string; name: string; slug: string; icon: string; image_id: string | null; active: boolean; sort_order: number; product_count?: number; transfer_surcharge_pct?: number | null };

export type StockState = 'ok' | 'low' | 'out' | 'untracked';

export type Product = {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  description: string | null;
  image_id: string | null;
  gallery: string[];
  price: number | null;
  old_price: number | null;
  unit_label: string | null;
  bulk_qty: number | null;
  bulk_price: number | null;
  offer_price: number | null;
  offer_from: string | null;
  offer_until: string | null;
  sku: string | null;
  cost: number | null;
  track_stock: boolean;
  stock_qty: number;
  min_stock: number;
  variant_label: string | null;
  variants?: Variant[];
  is_new: boolean;
  active: boolean;
  featured: boolean;
  sort_order: number;
  shared_at: string | null;
  share_hook: string | null;
  share_features: string | null;
  share_closing: string | null;
  created_at: string;
  updated_at: string;
  sold_30d?: number;
};

/** Lo que llega al navegador del cliente (sin costo ni cantidades exactas). */
export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  category_slug: string | null;
  category_name: string | null;
  description: string | null;
  image_id: string | null;
  gallery: string[];
  price: number | null;
  old_price: number | null;
  unit_label: string | null;
  bulk_qty: number | null;
  bulk_price: number | null;
  is_new: boolean;
  featured: boolean;
  best_seller: boolean;
  variant_label: string | null;
  variants: { id: string; name: string; price: number | null; available: boolean; max_qty: number | null }[];
  sold_30d: number;
  availability: 'ok' | 'low' | 'out';
  max_qty: number | null;
  created_at: string;
  offer_until: string | null; // oferta programada activa: cuándo termina
};

export type Variant = { id: string; product_id: string; name: string; sku: string | null; price: number | null; stock_qty: number; active: boolean; sort_order: number };

export const ORDER_STATUSES = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderItem = { product_id: string; variant_id: string | null; name: string; variant: string | null; qty: number; unit_price: number; subtotal: number; bulk?: boolean };
export type Order = {
  id: string; code: string; customer_name: string; customer_phone: string; customer_note: string | null;
  delivery_method: 'retiro' | 'envio'; address: string | null; shipping_zone?: string | null; payment_method: string | null;
  items: OrderItem[]; subtotal: number; shipping_cost: number | null; discount?: number | null; surcharge?: number | null; usd_rate?: number | null; total: number;
  status: OrderStatus; stock_applied: boolean; history: { status: string; at: string; by: string }[]; admin_note: string | null;
  payment_status: 'pendiente' | 'pagado'; created_at: string; updated_at: string;
};

export type Movement = {
  id: number; product_id: string; variant_id: string | null; variant_name: string | null; product_name: string; image_id: string | null; kind: 'entrada' | 'venta' | 'ajuste' | 'devolucion';
  qty: number; unit_price: number | null; note: string | null; created_by: string | null; created_at: string;
};

export const PAYMENT_METHODS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia bancaria',
  debito: 'Tarjeta de débito',
  credito: 'Tarjeta de crédito',
  mercadopago: 'Mercado Pago',
  dolares: 'Dólares (cotización del día)',
};

export type Review = { id: string; name: string; rating: number; text: string; status: 'pendiente' | 'publicada' | 'oculta'; created_at: string };
