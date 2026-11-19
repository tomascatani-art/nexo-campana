'use client';
import { Printer } from 'lucide-react';
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 font-semibold hover:bg-white/10">
      <Printer className="size-4" /> Imprimir o guardar PDF
    </button>
  );
}
