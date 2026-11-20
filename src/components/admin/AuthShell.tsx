// Marco simple para las páginas de acceso (activar cuenta, recuperar).
export function AuthShell({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-gray-50 px-5 py-10 sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-1.5 w-12 rounded-full bg-gold" />
          <p className="font-display text-lg font-extrabold uppercase text-gray-900">{businessName}</p>
        </div>
        {children}
        <a href="/" className="mt-8 block text-center text-sm font-semibold text-gray-500 hover:text-gray-900">← Volver a la web</a>
      </div>
    </main>
  );
}
