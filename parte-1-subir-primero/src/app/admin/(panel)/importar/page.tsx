import { requireAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { PageHeader } from '@/components/admin/fields';
import { Importer } from './Importer';

export const metadata = { title: 'Cargar desde Excel' };

export default async function Importar() {
  await requireAdmin();
  const products = await sql<{ id: string; sku: string | null; name: string; price: number | null; stock_qty: number }[]>`select id, sku, name, price::float8 as price, stock_qty from products`;
  return (
    <>
      <PageHeader title="Cargar desde Excel" description="Subí una planilla y se crean o actualizan muchos productos de una vez: precios, stock, categorías." />
      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ['1', 'Bajá la planilla', <span key="a"><a href="/admin/importar/modelo" className="font-semibold underline">Planilla modelo</a> o <a href="/admin/exportar" className="font-semibold underline">tus productos actuales</a> (para cambiar precios).</span>],
          ['2', 'Completala en Excel', 'Una fila por producto. Solo “Producto” es obligatorio. Lo que dejes vacío no se toca.'],
          ['3', 'Subila y revisá', 'Antes de guardar ves qué se crea y qué se actualiza. Busca por Código y, si no hay, por nombre.'],
        ].map(([n, t, d]) => (
          <li key={n as string} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><span className="flex size-7 items-center justify-center rounded-full bg-gold font-bold">{n}</span><p className="mt-2 font-bold">{t}</p><p className="text-sm text-gray-600">{d}</p></li>
        ))}
      </ol>
      <Importer existing={products} />
    </>
  );
}
