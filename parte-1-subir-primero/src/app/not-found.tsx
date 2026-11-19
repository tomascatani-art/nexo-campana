import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid-bg flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center text-white">
      <p className="gold-text font-display text-8xl font-black">404</p>
      <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">Esta página no existe o el producto ya no está disponible</h1>
      <p className="mt-3 text-mist">Puede que se haya agotado o que el enlace esté mal escrito.</p>
      <Link href="/#catalogo" className="mt-8 rounded-full bg-gold px-7 py-3.5 font-bold text-ink hover:bg-gold-soft">Ver el catálogo</Link>
    </main>
  );
}
