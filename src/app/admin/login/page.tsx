import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Ingresar al panel', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect('/admin');
  const s = await getSettings();
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
          <LoginForm />
          <a href="/" className="mt-8 block text-center text-sm font-semibold text-gray-500 hover:text-gray-900">← Volver a la web</a>
        </div>
      </div>
    </main>
  );
}
