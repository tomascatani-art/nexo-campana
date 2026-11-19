'use client';
import { useEffect } from 'react';
import { Printer } from 'lucide-react';

export function PdfActions() {
  // En el celular la hoja A4 se achica para verse entera (al imprimir vuelve a tamaño real)
  useEffect(() => {
    const sheet = document.querySelector<HTMLElement>('.sheet');
    if (!sheet) return;
    const fit = () => { const w = sheet.parentElement!.clientWidth; sheet.style.zoom = w < 794 ? String(w / 794) : ''; };
    const reset = () => { sheet.style.zoom = ''; };
    fit();
    window.addEventListener('resize', fit); window.addEventListener('beforeprint', reset); window.addEventListener('afterprint', fit);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('beforeprint', reset); window.removeEventListener('afterprint', fit); };
  }, []);
  return (
    <div className="no-print mx-auto mb-4 flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-3 px-3">
      <p className="text-sm text-neutral-700">Tocá el botón y elegí <b>“Guardar como PDF”</b> para mandarla por WhatsApp.</p>
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-[#0b0b0c] px-5 py-2.5 font-bold text-[#d4af37]">
        <Printer className="size-4" /> Descargar PDF
      </button>
    </div>
  );
}
