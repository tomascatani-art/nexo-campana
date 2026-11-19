'use client';
import Image from 'next/image';
import { useState } from 'react';

export function Gallery({ ids, alt, out }: { ids: string[]; alt: string; out?: boolean }) {
  const [i, setI] = useState(0);
  if (!ids.length) return <div className="aspect-square rounded-3xl bg-white" />;
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-white">
        {ids.map((id, k) => (
          <Image key={id} src={`/img/${id}`} alt={k === 0 ? alt : `${alt} – foto ${k + 1}`} fill priority={k === 0} sizes="(min-width:1024px) 560px, 100vw"
            className={`object-cover transition-opacity duration-500 ${k === i ? 'opacity-100' : 'opacity-0'} ${out ? 'grayscale' : ''}`} />
        ))}
      </div>
      {ids.length > 1 && (
        <div className="mt-3 flex gap-2">
          {ids.map((id, k) => (
            <button key={id} onClick={() => setI(k)} aria-label={`Ver foto ${k + 1}`} className={`relative size-16 overflow-hidden rounded-xl bg-white ring-2 transition ${k === i ? 'ring-gold' : 'ring-transparent opacity-60 hover:opacity-100'}`}>
              <Image src={`/img/${id}`} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
