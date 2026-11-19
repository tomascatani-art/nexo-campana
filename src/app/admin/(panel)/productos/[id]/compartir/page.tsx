import { withOffer } from '@/lib/pricing';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, PartyPopper, Plus } from 'lucide-react';
import { getProduct, getSettings } from '@/lib/data';
import { siteUrl } from '@/lib/format';
import { ShareKit } from '@/components/admin/ShareKit';
import { buildSingleText, linkLine } from '@/lib/share-text';
import { PageHeader } from '@/components/admin/fields';

export const metadata = { title: 'Compartir' };

export default async function ShareOne({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const [p, s] = await Promise.all([getProduct(id).catch(() => null), getSettings()]);
  if (!p) notFound();
  const site = siteUrl(s);
  const data = { id: p.id, slug: p.slug, name: p.name, description: p.description, ...withOffer({ price: p.price, old_price: p.old_price, offer_price: p.offer_price, offer_from: p.offer_from, offer_until: p.offer_until }), unit_label: p.unit_label, bulk_qty: p.bulk_qty, bulk_price: p.bulk_price,
    category_slug: p.category_slug, share_hook: p.share_hook, share_features: p.share_features, share_closing: p.share_closing };
  return (
    <>
      <Link href="/admin/productos" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="size-4" /> Productos</Link>
      {nuevo && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-600 p-4 text-white">
          <PartyPopper className="size-6 shrink-0" />
          <p className="flex-1 font-semibold">¡Producto publicado en la web! Ahora compartilo en tu canal.</p>
          <Link href="/admin/productos/nuevo" className="hidden shrink-0 items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-sm font-bold sm:inline-flex"><Plus className="size-4" /> Cargar otro</Link>
        </div>
      )}
      <PageHeader title="Compartir en el canal" description={p.name} />
      {!p.active && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">Este producto está oculto en la web: el enlace no va a funcionar hasta que lo actives.</p>}
      <ShareKit products={[data]} initialText={buildSingleText(data)} link={linkLine(data, site)} templates channelUrl={s.channel_url} siteUrl={site} />
      <p className="mt-4 text-sm text-gray-500">¿Querés cambiar la frase de arriba, las características o el cierre para siempre? <Link href={`/admin/productos/${p.id}#canal`} className="font-semibold underline">Editalos en el producto</Link>.</p>
      {nuevo && <Link href="/admin/productos/nuevo" className="mt-6 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-4 font-bold text-gray-700 hover:border-gold-deep sm:hidden"><Plus className="size-5" /> Cargar otro producto</Link>}
    </>
  );
}
