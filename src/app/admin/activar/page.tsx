import type { Metadata } from 'next';
import { inviteIsValid } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { getGoogleConfig } from '@/lib/google';
import { AuthShell } from '@/components/admin/AuthShell';
import { GoogleButton } from '@/components/admin/AccountTools';
import { ActivateForm } from './ActivateForm';

export const metadata: Metadata = { title: 'Crear tu cuenta', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ c?: string; error?: string }> }) {
  const { c = '', error } = await searchParams;
  const [s, valid, google] = [await getSettings(), await inviteIsValid(c), await getGoogleConfig()];
  return (
    <AuthShell businessName={s.business_name}>
      {!valid ? (
        <>
          <h1 className="text-3xl font-extrabold text-gray-900">Link vencido</h1>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
          <p className="mt-3 text-gray-600">Este link de activación ya se usó o venció. Pedile uno nuevo a quien te hizo la web. Si ya creaste tu cuenta, entrá normalmente.</p>
          <a href="/admin/login" className="mt-6 flex w-full items-center justify-center rounded-xl bg-gold py-4 text-lg font-bold text-ink hover:bg-gold-deep">Ir a ingresar</a>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-extrabold text-gray-900">Creá tu cuenta</h1>
          <p className="mt-2 text-gray-600">
            Es tu acceso al panel de la web. <strong>Desde que la crees, solo vos vas a poder entrar</strong>: el usuario de quien hizo la web se borra y nadie más conoce tu contraseña.
          </p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
          {google && (
            <>
              <div className="mt-6"><GoogleButton href={`/admin/google/entrar?modo=activar&c=${encodeURIComponent(c)}`}>Continuar con Google</GoogleButton></div>
              <p className="mt-2 text-center text-sm text-gray-500">Lo más fácil: entrás con tu cuenta de Google, sin otra contraseña.</p>
              <div className="my-6 flex items-center gap-3 text-sm text-gray-400"><span className="h-px flex-1 bg-gray-200" /> o con usuario y contraseña <span className="h-px flex-1 bg-gray-200" /></div>
            </>
          )}
          <ActivateForm token={c} />
        </>
      )}
    </AuthShell>
  );
}
