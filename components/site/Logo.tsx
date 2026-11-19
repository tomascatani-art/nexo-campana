/* eslint-disable @next/next/no-img-element */
/** Logotipo: usa la imagen cargada en el panel o, si no hay, un logotipo dibujado con la estética de la marca. */
export function Logo({ name, kind, logoId, className = '' }: { name: string; kind: string; logoId: string | null; className?: string }) {
  if (logoId) return <img src={`/img/${logoId}`} alt={name} className={`h-12 w-auto object-contain ${className}`} />;
  const [first, ...rest] = name.split(' ');
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Monogram className="size-11 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-black uppercase tracking-tight text-white">{first}</span>
        <span className="mt-1 font-display text-[10px] font-bold uppercase tracking-[0.32em] text-gold">{rest.join(' ') || kind}</span>
      </span>
    </span>
  );
}

export function Monogram({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="31" fill="#0b0b0c" />
      <circle cx="32" cy="32" r="28.5" fill="none" stroke="#f2c230" strokeWidth="2" />
      <path d="M19 46V18h8l11 16V18h7v28h-8L26 30v16z" fill="#f2c230" />
    </svg>
  );
}
