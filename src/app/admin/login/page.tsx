import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { getGoogleConfig } from '@/lib/google';
import { GoogleButton } from '@/components/admin/AccountTools';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Ingresar al panel', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentAdmin()) redirect('/admin');
  const { error } = await searchParams;
  const s = await getSettings();
  const google = await getGoogleConfig();
  return (
    <main className="grid min-h-dvh bg-ink lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        {s.hero_image_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/img/${s.hero_image_id}`} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="mb-6 h-1.5 w-24 rounded-full bg-gold" />
          <p className="font-display text-6xl font-extrabold uppercase leading-none">{s.business_name}</p>
          <p className="mt-3 text-xl text-white/70">Panel de administración</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-gray-50 px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 h-1.5 w-16 rounded-full bg-gold lg:hidden" />
          <h1 className="text-3xl font-extrabold text-gray-900">Ingresar</h1>
          <p className="mt-1 text-gray-500">Administrá tu web: productos, precios, stock y el canal de WhatsApp.</p>
          {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
          {google && (
            <>
              <div className="mt-8"><GoogleButton href="/admin/google/entrar?modo=ingresar">Entrar con Google</GoogleButton></div>
              <div className="mt-6 flex items-center gap-3 text-sm text-gray-400"><span className="h-px flex-1 bg-gray-200" /> o con usuario y contraseña <span className="h-px flex-1 bg-gray-200" /></div>
            </>
          )}
          <LoginForm />
          <a href="/admin/recuperar" className="mt-5 block text-center font-semibold text-gray-600 hover:text-gray-900">¿Olvidaste tu contraseña?</a>
          <a href="/" className="mt-8 block text-center text-sm font-semibold text-gray-500 hover:text-gray-900">← Volver a la web</a>
        </div>
      </div>
    </main>
  );
}
