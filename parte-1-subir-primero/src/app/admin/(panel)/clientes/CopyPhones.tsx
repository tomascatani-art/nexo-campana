'use client';
import { useState } from 'react';
import { Copy } from 'lucide-react';

/** Copia todos los teléfonos (uno por renglón) para armar una lista de difusión en WhatsApp. */
export function CopyPhones({ phones }: { phones: string[] }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(phones.join('\n')); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* */ } }} className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">
      <Copy className="size-4" /> {ok ? '¡Copiados!' : 'Copiar todos los teléfonos'}
    </button>
  );
}
