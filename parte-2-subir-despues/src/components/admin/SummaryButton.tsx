'use client';
import { useState } from 'react';
import { WhatsAppIcon } from '@/components/icons';

/**
 * "Mandarme el resumen": abre WhatsApp con el resumen del día listo para enviarse a uno mismo
 * (o a un socio). WhatsApp no permite que una web mande mensajes sola sin la API paga de WhatsApp Business.
 */
export function SummaryButton({ text, owner }: { text: string; owner: string | null }) {
  const [copied, setCopied] = useState(false);
  const n = (owner ?? '').replace(/\D/g, '');
  const url = `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* */ } }}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#25d366] bg-white px-5 py-3.5 font-bold text-emerald-800 hover:bg-emerald-50" title="Abre WhatsApp con el resumen del día">
      <WhatsAppIcon className="size-5 text-[#25d366]" /> {copied ? 'Resumen copiado ✓' : 'Mandarme el resumen'}
    </a>
  );
}
