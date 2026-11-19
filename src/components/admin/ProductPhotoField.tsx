'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { uploadImageAction } from '@/app/admin/actions';
import type { Brand, BrandStyle } from '@/lib/brand-photo';

type Choice = BrandStyle | 'original';
const CHOICES: [Choice, string][] = [['oscuro', 'Fondo NEXO'], ['claro', 'Fondo claro'], ['original', 'Original']];
const PREF = 'nexo-foto-estilo';

/**
 * Foto principal del producto: al sacarla, se recorta el fondo y se arma sola
 * con el fondo de la marca y el logo. El dueño puede elegir otra versión con un toque.
 */
export function ProductPhotoField({ name, defaultId, brand }: { name: string; defaultId: string | null; brand: Brand }) {
  const [id, setId] = useState<string | null>(defaultId);
  const [phase, setPhase] = useState<'idle' | 'recortando' | 'subiendo'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Partial<Record<Choice, string>>>({});
  const [choice, setChoice] = useState<Choice | null>(null);
  const blobs = useRef<Partial<Record<Choice, Blob>>>({});
  const uploaded = useRef<Partial<Record<Choice, string>>>({});
  const input = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Precarga el recortador mientras completa el resto del formulario
    import('@/lib/brand-photo').then((m) => m.warmUpBackgroundRemoval()).catch(() => {});
  }, []);

  async function upload(c: Choice) {
    if (uploaded.current[c]) { setId(uploaded.current[c]!); return; }
    const b = blobs.current[c];
    if (!b) return;
    setPhase('subiendo');
    try {
      const fd = new FormData();
      fd.append('file', b, 'foto.jpg');
      const r = await uploadImageAction(fd);
      if (r.error || !r.id) throw new Error(r.error || 'No se pudo subir la foto.');
      uploaded.current[c] = r.id;
      setId(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.');
    } finally {
      setPhase('idle');
    }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null); setNote(null); setPreviews({}); setChoice(null);
    blobs.current = {}; uploaded.current = {};
    setPhase('recortando');
    let pref: Choice = 'oscuro';
    try { pref = (localStorage.getItem(PREF) as Choice) || 'oscuro'; } catch { /* */ }
    try {
      const m = await import('@/lib/brand-photo');
      const original = await m.loadBitmap(f, 1600);
      blobs.current.original = await m.toJpeg(original, 0.88);
      setPreviews({ original: URL.createObjectURL(blobs.current.original) });
      let first: Choice = 'original';
      try {
        const cut = await m.cutOut(original);
        for (const st of ['oscuro', 'claro'] as const) {
          blobs.current[st] = await m.toJpeg(await m.compose(cut, st, brand), 0.9);
        }
        setPreviews((p) => ({ ...p, oscuro: URL.createObjectURL(blobs.current.oscuro!), claro: URL.createObjectURL(blobs.current.claro!) }));
        first = pref;
      } catch (e) {
        setNote(`${e instanceof Error && e.message.startsWith('No encontramos') ? e.message : 'No pudimos recortar el fondo de esta foto.'} Usamos la original.`);
      }
      setChoice(first);
      await upload(first);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la foto.');
      setPhase('idle');
    } finally {
      if (input.current) input.current.value = '';
      if (gallery.current) gallery.current.value = '';
    }
  }

  function pick(c: Choice) {
    if (!blobs.current[c] || phase !== 'idle') return;
    setChoice(c);
    try { localStorage.setItem(PREF, c); } catch { /* */ }
    upload(c);
  }

  const src = (choice && previews[choice]) || previews.original || (id ? `/img/${id}` : null);
  const ready = !!previews.oscuro;
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-2 font-semibold text-gray-800">Foto principal <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold-deep"><Sparkles className="size-3" /> fondo automático</span></span>
      <input type="hidden" name={name} value={id ?? ''} />
      <div className={`relative aspect-square max-w-md overflow-hidden rounded-xl border-2 border-dashed ${src ? 'border-gray-200' : 'border-gray-300'} bg-gray-50`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Foto del producto" className={`absolute inset-0 size-full object-cover transition duration-500 ${phase === 'recortando' ? 'scale-[1.02] blur-[2px] brightness-75' : ''}`} />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-gray-500 hover:text-gold-deep">
            <Camera className="size-9" />
            <span className="font-semibold">Tocá para sacar la foto</span>
            <span className="text-sm">El fondo se saca solo y se pone el de NEXO con el logo.</span>
          </button>
        )}
        {phase !== 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 text-white" role="status">
            {phase === 'recortando' ? <Wand2 className="size-9 animate-pulse" /> : <Loader2 className="size-9 animate-spin" />}
            <span className="rounded-full bg-black/60 px-4 py-1.5 text-sm font-bold">{phase === 'recortando' ? 'Sacando el fondo y poniendo el de NEXO…' : 'Guardando foto…'}</span>
          </div>
        )}
      </div>

      {ready && (
        <div className="mt-3 grid max-w-md grid-cols-3 gap-2" role="radiogroup" aria-label="Versión de la foto">
          {CHOICES.map(([c, l]) => (
            <button key={c} type="button" role="radio" aria-checked={choice === c} onClick={() => pick(c)} disabled={phase !== 'idle'} className={`overflow-hidden rounded-xl border-2 bg-white text-xs font-bold transition ${choice === c ? 'border-gold-deep ring-2 ring-gold/40' : 'border-gray-200 hover:border-gray-300'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[c]} alt="" className="aspect-square w-full object-cover" />
              <span className="block py-1.5">{l}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={phase !== 'idle'} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 font-semibold text-white hover:bg-coal disabled:opacity-50">
          <Camera className="size-4" /> {src ? 'Sacar otra' : 'Sacar foto'}
        </button>
        <button type="button" onClick={() => gallery.current?.click()} disabled={phase !== 'idle'} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-800 hover:border-gold-deep disabled:opacity-50">
          <ImagePlus className="size-4" /> Elegir de la galería
        </button>
        {src && (
          <button type="button" onClick={() => { setId(null); setPreviews({}); setChoice(null); }} disabled={phase !== 'idle'} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-100">
            <X className="size-4" /> Quitar
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="photo-camera" />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="photo-gallery" />
      <p className="mt-1.5 text-sm text-gray-500">{ready ? 'Elegí la versión que más te guste: se guarda la que esté marcada.' : 'Tip: producto entero, con buena luz y sin otras cosas alrededor.'}</p>
      {note && <p className="mt-2 text-sm font-medium text-amber-700">{note}</p>}
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
