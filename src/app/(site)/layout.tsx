import Link from 'next/link';
import { trace } from '@/lib/trace';
import { MapPin } from 'lucide-react';
import { getPublicData } from '@/lib/data';
import { groupHours, specialDayLabel, specialText, upcomingSpecials, waLink } from '@/lib/format';
import { SHIPPING_SOON_DEFAULT } from '@/lib/types';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from '@/components/icons';
import { Header } from '@/components/site/Header';
import { Logo } from '@/components/site/Logo';
import { ListProvider } from '@/components/site/ListProvider';
import { CartDrawer } from '@/components/site/CartDrawer';
import { FloatingBar } from '@/components/site/FloatingBar';
import { Interactions } from '@/components/site/Interactions';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  trace('layout: inicio');
  const { settings: s, hours, specials, products, categories } = await getPublicData();
  trace('layout: datos ok');
  const soon = upcomingSpecials(specials, 10).slice(0, 2);
  const notice = soon.length ? `📅 ${soon.map((d) => `${specialDayLabel(d.day)} (${d.reason}): ${specialText(d)}`).join(' · ')}` : null;
  const wa = waLink(s.whatsapp_number, `Hola ${s.business_name}! Quería hacer una consulta.`);
  const hasOffers = products.some((p) => p.old_price != null && p.price != null && p.old_price > p.price);
  const year = new Date().getFullYear();
  trace("layout: armando");
  return (
    <ListProvider products={products}>
      <div className="min-h-dvh overflow-x-clip bg-ink text-white">
        <Header logo={<Logo name={s.business_name} kind={s.business_kind} logoId={s.logo_image_id} />} hasOffers={hasOffers} announcement={s.announcement_on ? s.announcement_text : null} notice={notice} />
        {children}
        <footer className="border-t border-white/10 bg-coal pb-28 pt-14 sm:pb-14">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Logo name={s.business_name} kind={s.business_kind} logoId={s.logo_image_id} />
              <p className="mt-4 max-w-sm text-mist">{s.slogan}{s.tagline ? ` · ${s.tagline}` : ''}</p>
              <div className="mt-5 flex gap-2">
                {s.instagram_url && <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full border border-white/15 p-2.5 hover:border-gold hover:text-gold"><InstagramIcon className="size-5" /></a>}
                {s.facebook_url && <a href={s.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full border border-white/15 p-2.5 hover:border-gold hover:text-gold"><FacebookIcon className="size-5" /></a>}
                {s.tiktok_url && <a href={s.tiktok_url} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="rounded-full border border-white/15 p-2.5 hover:border-gold hover:text-gold"><TikTokIcon className="size-5" /></a>}
                {s.channel_url && <a href={s.channel_url} target="_blank" rel="noopener noreferrer" aria-label="Canal de WhatsApp" className="rounded-full border border-white/15 p-2.5 hover:border-wa hover:text-wa"><WhatsAppIcon className="size-5" /></a>}
              </div>
            </div>
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-widest text-gold">Catálogo</p>
              <ul className="mt-4 space-y-2 text-mist">
                {categories.slice(0, 7).map((c) => <li key={c.id}><a href={`/?categoria=${c.slug}#catalogo`} className="hover:text-white">{c.name}</a></li>)}
                <li><Link href="/novedades" className="hover:text-white">Novedades</Link></li>
                <li><Link href="/lista-de-precios" className="hover:text-white">Lista de precios</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-widest text-gold">Visitanos</p>
              <p className="mt-4 flex gap-2 text-mist"><MapPin className="mt-0.5 size-4 shrink-0" /> {[s.address, s.city, s.province].filter(Boolean).join(', ')}</p>
              <ul className="mt-3 space-y-1 text-sm text-mist">
                {groupHours(hours).map((g) => <li key={g.label}><span className="text-white">{g.label}:</span> {g.text}</li>)}
              </ul>
              {specials.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-mist">
                  {specials.slice(0, 4).map((d) => <li key={d.id}><span className="text-gold">{specialDayLabel(d.day)}</span> ({d.reason}): {specialText(d)}</li>)}
                </ul>
              )}
            </div>
          </div>
          <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-white/10 px-4 pt-6 text-sm text-mist sm:flex-row sm:justify-between sm:px-6">
            <div>
              <p>© {year} {s.business_name}. Todos los derechos reservados.</p>
              {s.admission_notice && <p className="mt-1 text-xs" data-testid="admission-notice"><Link href="/#politicas" className="hover:text-white">{s.admission_notice}</Link></p>}
            </div>
            <Link href="/admin" className="hover:text-white" rel="nofollow">Acceso propietario</Link>
          </div>
        </footer>
      </div>
      <CartDrawer cfg={{
        businessName: s.business_name, whatsapp: s.whatsapp_number || null, note: s.list_note,
        pickup: s.pickup_enabled || s.shipping_mode !== 'activo', shipping: s.shipping_mode === 'activo',
        shippingSoon: s.shipping_mode === 'proximamente' ? s.shipping_soon_text || SHIPPING_SOON_DEFAULT : null, zones: s.shipping_mode === 'activo' ? s.shipping_zones ?? [] : [], shippingCost: s.shipping_cost, freeFrom: s.free_shipping_from, shippingInfo: s.shipping_info,
        payments: (s.payment_methods ?? []), transferInfo: s.transfer_info_public ? s.transfer_info : null, minTotal: s.min_order_total, address: [s.address, s.city].filter(Boolean).join(', '),
        cashPct: s.payment_methods?.includes('efectivo') && s.cash_discount_pct ? s.cash_discount_pct : null,
        transferPct: s.transfer_surcharge_pct, catPct: Object.fromEntries(categories.filter((c) => c.transfer_surcharge_pct != null).map((c) => [c.slug, c.transfer_surcharge_pct!])),
        usdRate: s.usd_rate, transferNotice: s.transfer_notice, refundPolicy: s.refund_policy,
      }} />
      <FloatingBar wa={wa} />
      <Interactions />
    </ListProvider>
  );
}
