import { requireAdmin } from '@/lib/auth';
import { getAllReviews, getSettings } from '@/lib/data';
import { siteUrl, timeAgo } from '@/lib/format';
import { PageHeader } from '@/components/admin/fields';
import { ReviewRow } from './ReviewRow';

export const metadata = { title: 'Opiniones' };

export default async function Opiniones() {
  await requireAdmin();
  const [list, s] = await Promise.all([getAllReviews(), getSettings()]);
  const pending = list.filter((r) => r.status === 'pendiente').length;
  return (
    <>
      <PageHeader title="Opiniones de clientes" description="Los clientes opinan desde la web. Nada se publica hasta que vos lo aprobás." />
      <p className="mb-5 rounded-xl bg-white p-4 text-sm shadow-sm">
        Para pedir opiniones: cuando marcás un pedido como <b>Entregado</b>, el botón “Avisarle al cliente” ya incluye el enlace <span className="font-mono">{siteUrl(s).replace(/^https?:\/\//, '')}/#opiniones</span>.
        {pending > 0 && <b className="ml-1 text-amber-700">Tenés {pending} para revisar.</b>}
      </p>
      {list.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">Todavía no hay opiniones.</p> : (
        <ul className="space-y-3">{list.map((r) => <ReviewRow key={r.id} r={r} ago={timeAgo(new Date(r.created_at).toISOString())} />)}</ul>
      )}
    </>
  );
}
