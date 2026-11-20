import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { AuthShell } from '@/components/admin/AuthShell';
import { RecoverForm } from './RecoverForm';

export const metadata: Metadata = { title: 'Recuperar acceso', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RecoverPage() {
  const s = await getSettings();
  return (
    <AuthShell businessName={s.business_name}>
      <h1 className="text-3xl font-extrabold text-gray-900">Recuperar acceso</h1>
      <p className="mt-2 text-gray-600">Escribí tu usuario (o tu mail de Google) y el código de recuperación que guardaste al crear tu cuenta. Vas a poder poner una contraseña nueva.</p>
      <RecoverForm />
    </AuthShell>
  );
}
