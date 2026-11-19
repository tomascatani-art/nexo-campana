import Link from 'next/link';
import { ImageOff, Pencil, Plus } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { DeleteButton, Flash, MoveButtons, Toggle } from './ui';
import { PageHeader } from './fields';

export type Row = { id: string; name: string; sub?: string | null; image_id: string | null; price: number | null; active: boolean; featured?: boolean; warning?: string | null };

export function ItemList({
  title, description, table, basePath, rows, newLabel, featuredLabel = 'Destacado', ok, emptyText,
}: {
  title: string; description: string; table: string; basePath: string; rows: Row[]; newLabel: string; featuredLabel?: string; ok?: string; emptyText: string;
}) {
  return (
    <>
      {ok && <Flash message={ok} />}
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link href={`${basePath}/nuevo`} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-ink shadow-sm hover:bg-gold-deep">
            <Plus className="size-5" /> {newLabel}
          </Link>
        }
      />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.id} className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center ${r.active ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50'}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MoveButtons table={table} id={r.id} first={i === 0} last={i === rows.length - 1} />
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {r.image_id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/img/${r.image_id}`} alt="" className={`size-full object-cover ${r.active ? '' : 'opacity-50 grayscale'}`} loading="lazy" />
                  ) : (
                    <ImageOff className="m-auto mt-5 size-6 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <Link href={`${basePath}/${r.id}`} className="block truncate text-lg font-bold text-gray-900 hover:text-gold-deep">{r.name}</Link>
                  <p className="truncate text-sm text-gray-500">{[r.sub, r.price != null ? formatPrice(r.price) : 'Sin precio'].filter(Boolean).join(' · ')}</p>
                  {r.warning && <p className="text-sm font-semibold text-amber-600">{r.warning}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-gray-100 pt-3 sm:border-0 sm:pt-0">
                <Toggle table={table} id={r.id} field="active" value={r.active} label="Visible" onLabel="Visible" offLabel="Oculto" />
                {r.featured !== undefined && <Toggle table={table} id={r.id} field="featured" value={r.featured} label={featuredLabel} />}
                <div className="ml-auto flex items-center gap-1">
                  <Link href={`${basePath}/${r.id}`} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-gray-800 hover:bg-gray-100">
                    <Pencil className="size-4" /> Editar
                  </Link>
                  <DeleteButton table={table} id={r.id} name={r.name} compact />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
