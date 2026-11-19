import { getCategories, getProducts } from '@/lib/data';
import { Card, PageHeader, inputCls } from '@/components/admin/fields';
import { AdminForm, PriceEditor, SubmitButton } from '@/components/admin/ui';
import { bulkPriceAction } from '../../actions';

export const metadata = { title: 'Precios' };

export default async function Precios() {
  const [cats, products] = await Promise.all([getCategories(), getProducts()]);
  const sorted = [...products].sort((a, b) => (a.category_name ?? '').localeCompare(b.category_name ?? '') || a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader title="Precios" description="Aumentá todo de una vez con un porcentaje, o cambiá precios uno por uno." />
      <AdminForm action={bulkPriceAction} className="mb-6">
        <Card title="Aumento (o baja) por porcentaje" description="Ideal cuando cambia la lista del proveedor. Se aplica al precio, al precio anterior y al precio por cantidad.">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block font-semibold text-gray-800">Porcentaje</span>
              <span className="relative block"><input name="pct" inputMode="decimal" required placeholder="10" className={`${inputCls} pr-10 text-lg font-bold`} /><span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">%</span></span>
              <span className="mt-1 block text-sm text-gray-500">Usá -5 para bajar 5%.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-semibold text-gray-800">¿A qué productos?</span>
              <select name="category_id" className={inputCls}><option value="">Todos</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-semibold text-gray-800">Redondear a</span>
              <select name="round" defaultValue="100" className={inputCls}><option value="1">$1</option><option value="10">$10</option><option value="100">$100</option><option value="500">$500</option><option value="1000">$1.000</option></select>
            </label>
          </div>
          <SubmitButton>Aplicar a los precios</SubmitButton>
        </Card>
      </AdminForm>
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-100 p-4 font-bold">Precio por producto</h2>
        <ul className="divide-y divide-gray-100">
          {sorted.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{p.name}</span><span className="text-sm text-gray-500">{p.category_name ?? 'Sin categoría'}</span></span>
              <div className="flex flex-wrap gap-3">
                <div><span className="mb-1 block text-xs font-semibold text-gray-500">Precio</span><PriceEditor table="products" id={p.id} field="price" value={p.price} label={`Precio de ${p.name}`} /></div>
                <div><span className="mb-1 block text-xs font-semibold text-gray-500">Antes (tachado)</span><PriceEditor table="products" id={p.id} field="old_price" value={p.old_price} label={`Precio anterior de ${p.name}`} /></div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
