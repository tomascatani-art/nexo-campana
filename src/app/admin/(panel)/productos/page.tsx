import Link from 'next/link';
import { ImageOff, Pencil, Plus, Search } from 'lucide-react';
import { getCategories, getProducts } from '@/lib/data';
import { stockState, timeAgo } from '@/lib/format';
import { DeleteButton, Flash, PriceEditor, Toggle } from '@/components/admin/ui';
import { PageHeader } from '@/components/admin/fields';
import { WhatsAppIcon } from '@/components/icons';

export const metadata = { title: 'Productos' };

const FILTERS = [
  ['', 'Todos'],
  ['bajo', 'Stock bajo'],
  ['sin', 'Sin stock'],
  ['ocultos', 'Ocultos'],
  ['sin-compartir', 'Sin compartir'],
] as const;

export default async function Productos({ searchParams }: { searchParams: Promise<{ q?: string; c?: string; f?: string; ok?: string }> }) {
  const sp = await searchParams;
  const cats = await getCategories();
  const catId = cats.some((c) => c.id === sp.c) ? sp.c : undefined;
  const rows = await getProducts({ search: sp.q, categoryId: catId, filter: sp.f });
  const qs = (o: Record<string, string | undefined>) => '?' + new URLSearchParams(Object.entries({ q: sp.q, c: catId, f: sp.f, ...o }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      {sp.ok && <Flash message={sp.ok} />}
      <PageHeader
        title="Productos"
        description="Tocá un precio para cambiarlo. El interruptor Visible lo muestra u oculta en la web."
        actions={<Link href="/admin/productos/nuevo" className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-ink shadow-sm hover:bg-gold-deep"><Plus className="size-5" /> Cargar producto</Link>}
      />
      <form className="mb-3 flex gap-2" action="/admin/productos">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={sp.q} placeholder="Buscar por nombre o código" className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-3 outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30" />
        </label>
        <select name="c" defaultValue={catId ?? ''} className="max-w-36 rounded-xl border border-gray-300 bg-white px-3 sm:max-w-none" aria-label="Categoría">
          <option value="">Todas</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {sp.f && <input type="hidden" name="f" value={sp.f} />}
        <button className="rounded-xl bg-ink px-4 font-semibold text-white">Buscar</button>
      </form>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map(([v, l]) => (
          <Link key={v} href={`/admin/productos${qs({ f: v || undefined })}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${(sp.f ?? '') === v ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-gray-700'}`}>{l}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">No hay productos con ese filtro. <Link href="/admin/productos/nuevo" className="font-semibold text-ink underline">Cargá uno nuevo</Link>.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const st = stockState(p);
            return (
              <li key={p.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${p.active ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50'}`}>
                <div className="flex gap-3">
                  <Link href={`/admin/productos/${p.id}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image_id ? <img src={`/img/${p.image_id}`} alt="" loading="lazy" className={`size-full object-cover ${p.active ? '' : 'opacity-50 grayscale'}`} /> : <ImageOff className="m-auto mt-7 size-6 text-gray-400" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/productos/${p.id}`} className="line-clamp-2 font-bold leading-snug hover:underline">{p.name}</Link>
                    <p className="mt-0.5 truncate text-sm text-gray-500">{[p.category_name ?? 'Sin categoría', p.sku].filter(Boolean).join(' · ')}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-bold">
                      {st === 'out' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">Sin stock</span>}
                      {st === 'low' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Stock bajo: {p.stock_qty}</span>}
                      {st === 'ok' && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">Stock: {p.stock_qty}</span>}
                      {p.shared_at ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Compartido {timeAgo(p.shared_at)}</span> : p.active && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Sin compartir</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-gray-100 pt-3">
                  <PriceEditor table="products" id={p.id} field="price" value={p.price} label={`Precio de ${p.name}`} />
                  <Toggle table="products" id={p.id} field="active" value={p.active} label="Visible" onLabel="Visible" offLabel="Oculto" />
                  <Toggle table="products" id={p.id} field="featured" value={p.featured} label="Destacado" />
                  <div className="ml-auto flex items-center gap-1">
                    <Link href={`/admin/productos/${p.id}/compartir`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50" aria-label={`Compartir ${p.name}`}><WhatsAppIcon className="size-5" /> <span className="hidden sm:inline">Compartir</span></Link>
                    <Link href={`/admin/productos/${p.id}`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 font-semibold text-gray-800 hover:bg-gray-100"><Pencil className="size-4" /> Editar</Link>
                    <DeleteButton table="products" id={p.id} name={p.name} compact />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
