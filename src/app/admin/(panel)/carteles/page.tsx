import { getCategories, getProducts, getSettings } from '@/lib/data';
import { siteUrl } from '@/lib/format';
import { withOffer } from '@/lib/pricing';
import { Carteles, type SignProduct } from './Carteles';

export const metadata = { title: 'Carteles de precio' };

export default async function CartelesPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const [products, s, cats, sp] = await Promise.all([getProducts(), getSettings(), getCategories(), searchParams]);
  const base = siteUrl(s).replace(/\/$/, '');
  const list: SignProduct[] = products.map((raw) => {
    const p = withOffer(raw);
    const bulkOk = p.bulk_qty != null && p.bulk_price != null && (p.price == null || p.bulk_price < p.price);
    return {
      id: p.id, name: p.name, sku: p.sku ?? null, price: p.price, old_price: p.old_price && p.price != null && p.old_price > p.price ? p.old_price : null,
      unit_label: p.unit_label, bulk_qty: bulkOk ? p.bulk_qty : null, bulk_price: bulkOk ? p.bulk_price : null,
      category_id: p.category_id, category_name: p.category_name, active: p.active, is_new: p.is_new,
      url: `${base}/producto/${p.slug}`, image_id: p.image_id,
    };
  });
  return (
    <Carteles
      products={list}
      categories={cats.map((c) => ({ id: c.id, name: c.name }))}
      initialIds={(sp.ids ?? '').split(',').filter(Boolean)}
      shop={{ name: s.business_name, kind: s.business_kind, address: [s.address, s.city].filter(Boolean).join(' · '), cashPct: s.payment_methods.includes('efectivo') ? s.cash_discount_pct : null, usdRate: s.payment_methods.includes('dolares') ? s.usd_rate : null, logoId: s.logo_image_id }}
    />
  );
}
