'use client';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { Category } from '@/lib/types';
import { CATEGORY_ICONS, CategoryIcon } from '@/components/icons';
import { AdminForm, DeleteButton, ImageField, MoveButtons, SubmitButton, Toggle } from '@/components/admin/ui';
import { Field } from '@/components/admin/fields';
import { saveCategoryAction } from '@/app/admin/actions';

export function CategoryEditor({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {editing === 'new' ? <Form onDone={() => setEditing(null)} /> : (
        <button onClick={() => setEditing('new')} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white py-4 font-bold text-gray-700 hover:border-gold-deep"><Plus className="size-5" /> Nueva categoría</button>
      )}
      <ul className="space-y-3">
        {categories.map((c, i) => (
          <li key={c.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${c.active ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50'}`}>
            {editing === c.id ? <Form c={c} onDone={() => setEditing(null)} /> : (
              <div className="flex flex-wrap items-center gap-3">
                <MoveButtons table="categories" id={c.id} first={i === 0} last={i === categories.length - 1} />
                <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-xl bg-gold/15 text-gold-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image_id ? <img src={`/img/${c.image_id}`} alt="" className="size-full object-cover" /> : <CategoryIcon name={c.icon} className="size-6" />}
                </span>
                <span className="min-w-0 flex-1"><span className="block font-bold">{c.name}</span><span className="text-sm text-gray-500">{c.product_count} productos visibles</span></span>
                <Toggle table="categories" id={c.id} field="active" value={c.active} label="Visible" onLabel="Visible" offLabel="Oculta" />
                <button onClick={() => setEditing(c.id)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 font-semibold hover:bg-gray-100"><Pencil className="size-4" /> Editar</button>
                <DeleteButton table="categories" id={c.id} name={c.name} compact />
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-500">Si borrás una categoría, sus productos no se borran: quedan “Sin categoría”.</p>
    </div>
  );
}

function Form({ c, onDone }: { c?: Category; onDone: () => void }) {
  const [icon, setIcon] = useState(c?.icon ?? 'package');
  return (
    <AdminForm action={async (s, fd) => { const r = await saveCategoryAction(s, fd); if (r?.ok) setTimeout(onDone, 300); return r; }} resetOnSuccess={!c} className="space-y-4 rounded-2xl border border-gold/40 bg-white p-4">
      <input type="hidden" name="id" value={c?.id ?? ''} />
      <input type="hidden" name="icon" value={icon} />
      <Field label="Nombre" name="name" defaultValue={c?.name} required maxLength={50} placeholder="Ej: Bazar" />
      <div>
        <span className="mb-1.5 block font-semibold text-gray-800">Ícono</span>
        <div className="grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-gray-200 p-2 sm:grid-cols-10">
          {Object.entries(CATEGORY_ICONS).map(([k, { label, Icon }]) => (
            <button key={k} type="button" title={label} aria-label={label} onClick={() => setIcon(k)} className={`flex aspect-square items-center justify-center rounded-lg ${icon === k ? 'bg-gold text-ink' : 'text-gray-600 hover:bg-gray-100'}`}><Icon className="size-5" /></button>
          ))}
        </div>
      </div>
      <Field label="Recargo por transferencia propio (opcional)" name="transfer_surcharge_pct" defaultValue={c?.transfer_surcharge_pct ?? ''} inputMode="decimal" placeholder="Igual al general" help="Ej: Celulares 10. Vacío = usa el recargo general de Datos del negocio." />
      <ImageField name="image_id" label="Imagen (opcional)" defaultId={c?.image_id ?? null} aspect="aspect-square" help="Se usa en los accesos de la portada. Si no hay, se muestra el ícono." />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-xl px-5 py-3 font-semibold text-gray-600 hover:bg-gray-100">Cancelar</button>
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </AdminForm>
  );
}
