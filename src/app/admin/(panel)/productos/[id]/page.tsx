import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { getCategories, getMovements, getProduct, getSettings } from '@/lib/data';
import { ProductPhotoField } from '@/components/admin/ProductPhotoField';
import { saveProductAction, duplicateProductAction } from '../../../actions';
import { AdminForm, DeleteButton, Flash, GalleryField, SubmitButton } from '@/components/admin/ui';
import { Card, Check, Field, PageHeader, PriceField, TextArea, inputCls } from '@/components/admin/fields';
import { WhatsAppIcon } from '@/components/icons';
import { VariantsEditor } from '@/components/admin/VariantsEditor';
import { formatPrice, timeAgo } from '@/lib/format';
import type { Product } from '@/lib/types';
import { presetFor } from '@/lib/share-text';
import { offerActive } from '@/lib/pricing';

/** timestamptz → valor para <input type=datetime-local> en hora de Argentina */
function arLocal(d: string | Date | null | undefined) {
  if (!d) return '';
  return new Date(new Date(d).getTime() - 3 * 3600e3).toISOString().slice(0, 16);
}

export const metadata = { title: 'Producto' };

export default async function ProductForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const isNew = id === 'nuevo';
  const p: Partial<Product> = isNew ? { active: true, is_new: true, track_stock: true, min_stock: 2, gallery: [] } : ((await getProduct(id).catch(() => null)) ?? notFound());
  const [cats, st] = await Promise.all([getCategories(), getSettings()]);
  const moves = isNew ? [] : await getMovements({ productId: id, limit: 6 });
  const preset = presetFor(p.category_slug ?? cats[0]?.slug);

  return (
    <>
      {ok && <Flash message={ok} />}
      <Link href="/admin/productos" className="mb-4 inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="size-4" /> Productos</Link>
      <PageHeader
        title={isNew ? 'Cargar producto' : 'Editar producto'}
        description={isNew ? 'Sacale una foto, poné nombre y precio, y listo. Lo demás es opcional.' : undefined}
        actions={!isNew && (
          <>
            <Link href={`/admin/productos/${id}/compartir`} className="inline-flex items-center gap-2 rounded-xl bg-[#25d366] px-4 py-2.5 font-bold text-white hover:bg-[#1da851]"><WhatsAppIcon className="size-5" /> Compartir</Link>
            <a href={`/producto/${p.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-semibold hover:bg-gray-50"><ExternalLink className="size-4" /> Ver en la web</a>
          </>
        )}
      />
      <AdminForm action={saveProductAction} className="space-y-5">
        <input type="hidden" name="id" value={isNew ? '' : id} />
        <Card title="Foto y datos principales">
          <ProductPhotoField name="image_id" defaultId={p.image_id ?? null} brand={{ name: st.business_name, tagline: st.tagline, logoUrl: st.logo_image_id ? `/img/${st.logo_image_id}` : null }} />
          <GalleryField name="gallery" defaultIds={p.gallery ?? []} />
          <Field label="Nombre del producto" name="name" defaultValue={p.name} required maxLength={120} placeholder="Ej: Pava eléctrica 1,7 L acero" />
          <div className="grid gap-5 sm:grid-cols-2">
            <PriceField label="Precio" name="price" defaultValue={p.price} help="Vacío = “Consultar precio”." />
            <Field label="Se vende por (opcional)" name="unit_label" defaultValue={p.unit_label} maxLength={30} placeholder="c/u, x6, x caja, set…" />
          </div>
          <label className="block">
            <span className="mb-1.5 block font-semibold text-gray-800">Categoría</span>
            <select name="category_id" defaultValue={p.category_id ?? cats[0]?.id ?? ''} className={inputCls}>
              <option value="">Sin categoría</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span className="mt-1.5 block text-sm text-gray-500">¿Falta una? <Link href="/admin/categorias" className="font-semibold underline">Crear categoría</Link></span>
          </label>
          <TextArea label="Descripción (opcional)" name="description" defaultValue={p.description} rows={3} maxLength={1500} placeholder="Medidas, potencia, materiales, garantía…" />
        </Card>

        <Card title="Ofertas y precio por cantidad" description="Opcional. Ayudan a vender más.">
          <PriceField label="Precio anterior (sale tachado)" name="old_price" defaultValue={p.old_price} help="Si lo completás, el producto aparece en Ofertas con el % de descuento." />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Precio por cantidad: desde (unidades)" name="bulk_qty" type="number" inputMode="numeric" defaultValue={p.bulk_qty} placeholder="Ej: 6" />
            <PriceField label="…cada unidad sale" name="bulk_price" defaultValue={p.bulk_price} />
          </div>
          <p className="-mt-2 text-sm text-gray-500">Ej: “Llevando 6 o más, $16.999 c/u”. La lista del cliente lo aplica sola.</p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" id="oferta-programada">
            <p className="font-bold">⏰ Oferta programada</p>
            <p className="mb-3 text-sm text-gray-600">Se activa y se termina sola: en ese período la web muestra este precio con el normal tachado. Ej: “Hot Sale”, “fin de semana”.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <PriceField label="Precio de oferta" name="offer_price" defaultValue={p.offer_price} />
              <Field label="Desde (vacío = ya)" name="offer_from" type="datetime-local" defaultValue={arLocal(p.offer_from)} />
              <Field label="Hasta" name="offer_until" type="datetime-local" defaultValue={arLocal(p.offer_until)} />
            </div>
            {p.offer_price != null && <p className="mt-2 text-sm font-semibold">{offerActive({ offer_price: p.offer_price ?? null, offer_from: p.offer_from ?? null, offer_until: p.offer_until ?? null }) ? '🟢 La oferta está activa ahora.' : p.offer_until && new Date(p.offer_until) < new Date() ? '⚪ Esta oferta ya terminó (borrá el precio de oferta para limpiarla).' : '🟡 Programada: todavía no empezó.'}</p>}
          </div>
        </Card>

        <Card title="Stock y variantes" description="Cuántas unidades tenés. Cuando se agota, la web lo muestra “Sin stock”.">
          <Check label="Controlar stock de este producto" name="track_stock" defaultChecked={p.track_stock} help="Destildalo para productos que siempre tenés (o que pedís a medida)." />
          <VariantsEditor label={p.variant_label ?? null} variants={p.variants ?? []} stock={p.stock_qty} isNew={isNew} />
          <Field label="Avisarme cuando queden" name="min_stock" type="number" inputMode="numeric" defaultValue={p.min_stock ?? 2} help="Te aparece en “Reponer pronto” y en el tablero." />
          <div className="grid gap-5 sm:grid-cols-2">
            <PriceField label="Costo (solo lo ves vos)" name="cost" defaultValue={p.cost} help="Para calcular el valor de tu mercadería y la ganancia." />
            <Field label="Código interno (opcional)" name="sku" defaultValue={p.sku} maxLength={40} placeholder="Ej: NX-120" />
          </div>
          {moves.length > 0 && (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Últimos movimientos</p>
              <ul className="space-y-1 text-sm">
                {moves.map((m) => <li key={m.id} className="flex justify-between gap-3"><span><b className={m.qty > 0 ? 'text-emerald-600' : 'text-red-600'}>{m.qty > 0 ? '+' : ''}{m.qty}</b> {m.kind}{m.variant_name ? ` (${m.variant_name})` : ''}{m.unit_price ? ` a ${formatPrice(m.unit_price)}` : ''}{m.note ? ` · ${m.note}` : ''}</span><span className="text-gray-400">{timeAgo(m.created_at)}</span></li>)}
              </ul>
            </div>
          )}
        </Card>

        <div id="canal" className="scroll-mt-24">
          <Card title="Publicación para el canal de WhatsApp" description="Opcional. Si lo dejás vacío, el texto se arma solo con la categoría, la descripción y el precio.">
            <Field label="Frase de arriba (gancho)" name="share_hook" defaultValue={p.share_hook} maxLength={120} placeholder={preset.hook} />
            <TextArea label="Características (una por renglón)" name="share_features" defaultValue={p.share_features} rows={4} maxLength={800} placeholder={'Tapa de vidrio\nControl de temperatura regulable\nPráctica y cómoda de usar'} help="Cada renglón sale con ✅. Vacío = se toman de la descripción." />
            <Field label="Frase de cierre" name="share_closing" defaultValue={p.share_closing} maxLength={160} placeholder={preset.closing} />
            <p className="-mt-1 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">Queda así: <b>gancho</b> → ✨ NOMBRE ✨ → ✅ características → 💥 PRECIO 💥 → <b>cierre</b>. Podés usar emojis.</p>
          </Card>
        </div>

        <Card title="Cómo se muestra">
          <div className="grid gap-3 sm:grid-cols-3">
            <Check label="Visible en la web" name="active" defaultChecked={p.active} />
            <Check label="Destacado" name="featured" defaultChecked={p.featured} help="Sale arriba, en Destacados." />
            <Check label="Etiqueta “Nuevo”" name="is_new" defaultChecked={p.is_new} help="Se quita sola a las 3 semanas." />
          </div>
        </Card>

        <div className="sticky bottom-20 z-30 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <div className="hidden gap-1 sm:flex">
            {!isNew && <DeleteButton table="products" id={id} name={p.name ?? ''} redirectTo="/admin/productos" />}
            {!isNew && <button formAction={duplicateProductAction.bind(null, id)} formNoValidate className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-100"><Copy className="size-4" /> Duplicar</button>}
          </div>
          <SubmitButton className="w-full sm:w-auto">{isNew ? 'Guardar y compartir' : 'Guardar cambios'}</SubmitButton>
        </div>
        {!isNew && (
          <div className="flex justify-center gap-2 sm:hidden">
            <DeleteButton table="products" id={id} name={p.name ?? ''} redirectTo="/admin/productos" />
            <button formAction={duplicateProductAction.bind(null, id)} formNoValidate className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-100"><Copy className="size-4" /> Duplicar</button>
          </div>
        )}
      </AdminForm>
    </>
  );
}
