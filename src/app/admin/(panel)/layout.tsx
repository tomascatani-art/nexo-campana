import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { sql } from '@/lib/db';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata: Metadata = { title: { default: 'Panel', template: '%s · Panel' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [s, [{ n }]] = await Promise.all([getSettings(), sql<{ n: number }[]>`select count(*)::int as n from orders where status = 'pendiente'`]);
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <AdminNav businessName={s.business_name} userName={user.display_name || user.username} newOrders={n} />
      <main className="px-4 pb-32 pt-20 sm:px-6 lg:ml-72 lg:px-10 lg:pb-16 lg:pt-10 print:m-0 print:p-0">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
