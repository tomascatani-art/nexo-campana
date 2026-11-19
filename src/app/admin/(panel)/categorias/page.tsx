import { getCategories } from '@/lib/data';
import { PageHeader } from '@/components/admin/fields';
import { CategoryEditor } from './CategoryEditor';

export const metadata = { title: 'Categorías' };

export default async function Categorias() {
  const cats = await getCategories();
  return (
    <>
      <PageHeader title="Categorías" description="Ordenan el catálogo y aparecen como accesos en la portada. Usá las flechas para cambiar el orden." />
      <CategoryEditor categories={cats} />
    </>
  );
}
