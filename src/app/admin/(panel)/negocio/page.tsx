import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { Card, Check, Field, PageHeader, PriceField, TextArea, inputCls } from '@/components/admin/fields';
import { AdminForm, ImageField, SubmitButton } from '@/components/admin/ui';
import { PAYMENT_METHODS } from '@/lib/types';
import { saveSettingsAction } from '../../actions';
import { HeroVideoField } from '@/components/admin/HeroVideoField';

export const metadata = { title: 'Datos del negocio' };

const TABS = [
  ['contacto', 'WhatsApp y contacto'],
  ['venta', 'Envíos, pagos y promos'],
  ['general', 'Nombre, logo y anuncio'],
  ['portada', 'Portada y Nosotros'],
  ['google', 'Google'],
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const s = await getSettings();
  const { tab: t } = await searchParams;
  const tab = TABS.some(([v]) => v === t) ? t! : 'contacto';
  const footer = (
    <div className="sticky bottom-20 z-10 flex justify-end rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
      <SubmitButton />
    </div>
  );
  return (
    <>
      <PageHeader title="Datos del negocio" description="Todo lo que se muestra en la web y cómo vendés. Cada pestaña se guarda por separado." />
      <nav className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 text-sm font-semibold">
        {TABS.map(([v, l]) => <Link key={v} href={`/admin/negocio?tab=${v}`} className={`shrink-0 rounded-full border px-4 py-2 ${tab === v ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white hover:border-gray-400'}`}>{l}</Link>)}
      </nav>
      <AdminForm key={tab} action={saveSettingsAction} className="space-y-6">
        <input type="hidden" name="_section" value={tab} />
        {tab === 'contacto' && (
          <>
            <Card title="WhatsApp" description="Los pedidos y todos los botones de WhatsApp de la web van a este número.">
              <Field label="Número de WhatsApp" name="whatsapp_number" defaultValue={s.whatsapp_number} inputMode="tel" placeholder="5493489123456" help="Solo números: 54 + 9 + código de área sin 0 + número sin 15. Ej: 3489 15-123456 → 5493489123456" />
              <Field label="Enlace de tu canal de WhatsApp" name="channel_url" defaultValue={s.channel_url} placeholder="https://whatsapp.com/channel/…" help="En WhatsApp: Novedades → tu canal → nombre del canal → Compartir enlace → Copiar." />
            </Card>
            <Card title="Otros contactos y redes">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Teléfono (opcional)" name="phone" defaultValue={s.phone} maxLength={40} />
                <Field label="Email (opcional)" name="email" type="email" defaultValue={s.email} maxLength={120} />
                <Field label="Instagram (enlace)" name="instagram_url" defaultValue={s.instagram_url} placeholder="https://www.instagram.com/..." />
                <Field label="Facebook (enlace)" name="facebook_url" defaultValue={s.facebook_url} placeholder="https://www.facebook.com/..." />
                <Field label="TikTok (enlace)" name="tiktok_url" defaultValue={s.tiktok_url} placeholder="https://www.tiktok.com/@..." />
              </div>
            </Card>
            <Card title="Dirección y mapa">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Dirección" name="address" defaultValue={s.address} maxLength={120} />
                <Field label="Ciudad" name="city" defaultValue={s.city} maxLength={60} />
                <Field label="Provincia" name="province" defaultValue={s.province} maxLength={60} />
                <Field label="Código postal" name="postal_code" defaultValue={s.postal_code} maxLength={12} />
              </div>
              <Field label="Búsqueda para el mapa" name="maps_query" defaultValue={s.maps_query} maxLength={200} help="Cómo encontrar el local en Google Maps: dirección, ciudad, provincia, Argentina." />
            </Card>
          </>
        )}
        {tab === 'venta' && (
          <>
            <Card title="Entrega" description="Qué opciones ve el cliente al hacer el pedido.">
              <Check label="Retiro en el local" name="pickup_enabled" defaultChecked={s.pickup_enabled} />
              <Link href="/admin/envios" className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 font-semibold hover:border-gold-deep">
                <span>🚚 Envíos a domicilio: <b>{s.shipping_mode === 'activo' ? 'activos' : s.shipping_mode === 'proximamente' ? 'próximamente' : 'desactivados'}</b><span className="block text-sm font-normal text-gray-500">Costos, zonas, envío gratis y lista de interesados.</span></span>
                <span className="text-gold-deep">Configurar →</span>
              </Link>
              <PriceField label="Compra mínima (opcional)" name="min_order_total" defaultValue={s.min_order_total} help="Útil si vendés solo por mayor." />
            </Card>
            <Card title="Pedidos para retirar" description="Para que no te queden pedidos apartados que nadie viene a buscar.">
              <label className="block max-w-xs">
                <span className="mb-1.5 block font-semibold text-gray-800">⏳ Cuánto tiempo se guarda un pedido</span>
                <select name="order_hold_hours" defaultValue={String(s.order_hold_hours)} className={`${inputCls} text-lg font-bold`}>
                  <option value="24">24 horas</option>
                  <option value="48">48 horas</option>
                  <option value="72">72 horas</option>
                  <option value="0">No vencen nunca</option>
                </select>
                <span className="mt-1.5 block text-sm text-gray-500">El cliente lo ve al hacer el pedido. Si no lo retira a tiempo, el pedido pasa solo a “Vencido” y el stock vuelve.</span>
              </label>
              <label className="mt-4 block max-w-xs">
                <span className="mb-1.5 block font-semibold text-gray-800">💰 Seña para los que no retiraron</span>
                <span className="relative block"><input name="noshow_deposit_pct" defaultValue={s.noshow_deposit_pct ?? 20} inputMode="decimal" className={`${inputCls} pr-10 text-lg font-bold`} /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">%</span></span>
                <span className="mt-1.5 block text-sm text-gray-500">A los clientes de la lista <Link href="/admin/clientes#no-retiraron" className="underline">“No retiraron”</Link> se les avisa que tienen que dejar esta seña.</span>
              </label>
            </Card>
            <Card title="Medios de pago" description="Los que el cliente puede elegir. El pago se coordina con vos al confirmar (no se cobra online).">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(PAYMENT_METHODS).map(([k, l]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300">
                    <input type="checkbox" name="payment_methods" value={k} defaultChecked={s.payment_methods.includes(k)} className="size-6 accent-gold-deep" />
                    <span className="font-semibold">{l}</span>
                    {k === 'mercadopago' && <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">link de pago manual</span>}
                  </label>
                ))}
              </div>
              <Field label="Datos para transferencia (alias / CBU)" name="transfer_info" defaultValue={s.transfer_info} maxLength={200} placeholder="Alias: NEXO.CAMPANA · CBU …" help="Lo usan tus respuestas rápidas por WhatsApp." />
              <Check label="Mostrar el alias en la web" name="transfer_info_public" defaultChecked={s.transfer_info_public} help="Apagado: el cliente tiene que pedirte el alias por WhatsApp (recomendado si cambiás de cuenta)." />
              <label className="mt-4 block max-w-xs">
                <span className="mb-1.5 block font-semibold text-gray-800">💵 Descuento pagando en efectivo</span>
                <span className="relative block"><input name="cash_discount_pct" defaultValue={s.cash_discount_pct ?? ''} inputMode="decimal" placeholder="Sin descuento" className={`${inputCls} pr-10 text-lg font-bold`} /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">%</span></span>
                <span className="mt-1.5 block text-sm text-gray-500">Ej: 10. La web muestra el precio en efectivo y el carrito lo descuenta solo.</span>
              </label>
            </Card>
            <Card title="Políticas del local" description="Recargos, dólares y avisos. Se ven en el carrito, en la sección “Políticas del local” y en el saludo del canal.">
              <label className="block max-w-xs">
                <span className="mb-1.5 block font-semibold text-gray-800">📱 Recargo por transferencia</span>
                <span className="relative block"><input name="transfer_surcharge_pct" defaultValue={s.transfer_surcharge_pct ?? ''} inputMode="decimal" placeholder="Sin recargo" className={`${inputCls} pr-10 text-lg font-bold`} /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">%</span></span>
                <span className="mt-1.5 block text-sm text-gray-500">Ej: 5. Para un recargo distinto en una categoría (ej: Celulares 10%), editala en <Link href="/admin/categorias" className="underline">Categorías</Link>.</span>
              </label>
              <TextArea label="Aviso al elegir transferencia" name="transfer_notice" defaultValue={s.transfer_notice} maxLength={240} rows={2} help="Ej: Pedí el alias por WhatsApp antes de transferir. Si no, no se aceptan reclamos." />
              <TextArea label="Política de devoluciones" name="refund_policy" defaultValue={s.refund_policy} maxLength={240} rows={2} help="Ej: El dinero no se devuelve. No hay excepciones." />
              <TextArea label="Derecho de admisión" name="admission_notice" defaultValue={s.admission_notice} maxLength={160} rows={2} help="Se ve en las políticas y al pie de toda la web. Vacío = no se muestra." />
              <p className="text-sm text-gray-600">💵 La <b>cotización del dólar</b> se cambia todos los días desde el <Link href="/admin" className="underline">Tablero</Link>. Para aceptar dólares, tildá “Dólares” en Medios de pago.</p>
            </Card>
            <Card title="Promociones y stock en la web">
              <Check label="Mostrar ofertas y precios por cantidad" name="promos_enabled" defaultChecked={s.promos_enabled} help="Apagalo para ocultar de golpe todos los precios tachados y precios mayoristas." />
              <Check label="Mostrar “¡Últimas unidades!”" name="show_stock_left" defaultChecked={s.show_stock_left} help="Cuando un producto llega a su stock mínimo." />
              <Check label="Ocultar productos sin stock" name="hide_out_of_stock" defaultChecked={s.hide_out_of_stock} help="Si no, se muestran en gris con “Sin stock”." />
            </Card>
            <Card title="Textos">
              <TextArea label="Aviso debajo de los precios" name="price_note" defaultValue={s.price_note} maxLength={300} rows={2} />
              <TextArea label="Aviso en el carrito" name="list_note" defaultValue={s.list_note} maxLength={300} rows={2} />
              <TextArea label="Pie de las publicaciones del canal" name="share_footer" defaultValue={s.share_footer} maxLength={300} rows={3} help="Se agrega al final del texto cuando compartís un producto." />
            </Card>
          </>
        )}
        {tab === 'general' && (
          <>
            <Card title="Marca">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre del negocio" name="business_name" defaultValue={s.business_name} required maxLength={80} />
                <Field label="Rubro" name="business_kind" defaultValue={s.business_kind} required maxLength={40} placeholder="Mayorista y minorista" />
                <Field label="Eslogan" name="slogan" defaultValue={s.slogan} maxLength={120} />
                <Field label="Rubros (línea corta)" name="tagline" defaultValue={s.tagline} maxLength={120} placeholder="Electro · Hogar · Tecnología" />
              </div>
              <ImageField name="logo_image_id" label="Logo (opcional)" defaultId={s.logo_image_id} aspect="aspect-square" help="Ideal: el logo redondo en PNG. Si no subís uno, se usa el monograma dorado." />
            </Card>
            <Card title="Barra de anuncio" description="Una franja dorada arriba de la web para avisos cortos.">
              <Check label="Mostrar barra de anuncio" name="announcement_on" defaultChecked={s.announcement_on} />
              <Field label="Texto del anuncio" name="announcement_text" defaultValue={s.announcement_text} maxLength={160} placeholder="🔥 Esta semana: 10% off en bazar" />
            </Card>
          </>
        )}
        {tab === 'portada' && (
          <>
            <Card title="Video de bienvenida" description="Lo primero que ve el cliente al entrar a la web.">
              <Check name="hero_video_on" label="Mostrar el video en la portada" defaultChecked={s.hero_video_on} help="Si lo apagás, la portada usa la foto de fondo de abajo." />
              <Field label="Cartel de bienvenida" name="hero_welcome" defaultValue={s.hero_welcome} maxLength={40} placeholder="Bienvenidos" help="Aparece letra por letra en dorado. Vacío = sin cartel." />
              <HeroVideoField current={s.hero_video_id ? `/media/${s.hero_video_id}` : '/video/nexo-entrada.mp4'} poster={s.hero_poster_id ? `/img/${s.hero_poster_id}` : '/video/nexo-entrada.jpg'} custom={!!s.hero_video_id} />
            </Card>
            <Card title="Portada (lo primero que se ve)">
              <Field label="Título principal" name="hero_title" defaultValue={s.hero_title} maxLength={90} help="Lo que va después de la coma se pinta en dorado." />
              <TextArea label="Texto debajo del título" name="hero_subtitle" defaultValue={s.hero_subtitle} maxLength={300} rows={3} />
              <ImageField name="hero_image_id" label="Foto de fondo" defaultId={s.hero_image_id} help="Una foto horizontal del depósito o de productos. Se oscurece sola para que el texto se lea." />
            </Card>
            <Card title="Sección Nosotros">
              <Field label="Título" name="about_title" defaultValue={s.about_title} maxLength={120} />
              <TextArea label="Texto" name="about_text" defaultValue={s.about_text} maxLength={3000} rows={6} help="Dejá una línea en blanco para separar párrafos." />
              <ImageField name="about_image_id" label="Foto (el local, el equipo…)" defaultId={s.about_image_id} aspect="aspect-[4/3]" />
            </Card>
          </>
        )}
        {tab === 'google' && (
          <Card title="Google (SEO)" description="Cómo aparece tu web en los resultados de búsqueda.">
            <Field label="Título en Google" name="seo_title" defaultValue={s.seo_title} maxLength={90} help="Ideal: hasta 60 caracteres." />
            <TextArea label="Descripción en Google" name="seo_description" defaultValue={s.seo_description} maxLength={200} rows={3} help="Ideal: hasta 155 caracteres." />
          </Card>
        )}
        {footer}
      </AdminForm>
    </>
  );
}
