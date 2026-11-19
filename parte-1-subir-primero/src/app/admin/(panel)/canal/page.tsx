import { withOffer } from '@/lib/pricing';
import { getCategories, getHours, getProducts, getSettings, getSpecialDays } from '@/lib/data';
import { nowInArgentina } from '@/lib/format';
import { surchargeText } from '@/lib/pricing';
import { Greeting } from './Greeting';
import { siteUrl } from '@/lib/format';
import { PageHeader } from '@/components/admin/fields';
import { BatchShare } from './BatchShare';

export const metadata = { title: 'Compartir en canal' };

export default async function Canal() {
  const [all, s, cats, hours, specials] = await Promise.all([getProducts(), getSettings(), getCategories(), getHours(), getSpecialDays()]);
  const { day, ymd } = nowInArgentina();
  const sp = specials.find((x) => x.day === ymd);
  const openToday = sp ? sp.is_open : !!hours.find((h) => h.day_of_week === day)?.is_open;
  const vals = {
    day, openToday, closedReason: sp && !sp.is_open ? sp.reason : null,
    recargo: surchargeText(s.transfer_surcharge_pct, cats.filter((c) => c.transfer_surcharge_pct != null).map((c) => ({ name: c.name, pct: c.transfer_surcharge_pct! }))),
    usdRate: s.payment_methods.includes('dolares') ? s.usd_rate : null, business: s.business_name,
  };
  const products = all.filter((p) => p.active).slice(0, 60).map((p) => ({
    id: p.id, slug: p.slug, name: p.name, description: p.description, ...withOffer({ price: p.price, old_price: p.old_price, offer_price: p.offer_price, offer_from: p.offer_from, offer_until: p.offer_until }), unit_label: p.unit_label,
    bulk_qty: p.bulk_qty, bulk_price: p.bulk_price, image_id: p.image_id, shared_at: p.shared_at, created_at: new Date(p.created_at).toISOString(),
  }));
  return (
    <>
      <PageHeader title="Compartir en el canal" description="Elegí los productos (por defecto, los que todavía no compartiste) y publicalos juntos: varias fotos con precio + un texto con el enlace a Novedades." />
      <Greeting template={s.greeting_template} vals={vals} channelUrl={s.channel_url} />
      <p className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 text-sm shadow-sm">📄 <b>Lista de precios en PDF</b> con tu logo, para mandar a revendedores o fijar en el canal: <a href="/lista-de-precios-pdf" target="_blank" className="font-semibold text-gold-deep underline">Abrir y descargar</a></p>
      <BatchShare products={products} business={s.business_name} footer={s.share_footer} channelUrl={s.channel_url} site={siteUrl(s)} />
    </>
  );
}
