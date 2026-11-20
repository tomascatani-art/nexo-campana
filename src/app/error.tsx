'use client';

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center text-white">
      <h1 className="font-display text-3xl font-black">Estamos actualizando la tienda</h1>
      <p className="mt-3 text-mist">No pudimos cargar los productos en este momento. Probá de nuevo en unos segundos.</p>
      <button onClick={() => reset()} className="mt-6 rounded-full bg-gold px-8 py-3 font-bold text-ink">Reintentar</button>
    </main>
  );
}
