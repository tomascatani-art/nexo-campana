'use client';
import { useRef, useState } from 'react';
import { Film, Loader2, RotateCcw, Upload } from 'lucide-react';
import { appendVideoChunkAction, finishVideoUploadAction, resetHeroVideoAction, startVideoUploadAction, uploadImageAction } from '@/app/admin/actions';

const PART = 3 * 1024 * 1024;

/** Lee el video en el navegador: comprueba que se pueda ver y saca la imagen de portada del primer segundo. */
function inspect(file: File): Promise<{ poster: Blob | null; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    const fail = () => { URL.revokeObjectURL(url); reject(new Error('unplayable')); };
    const timer = setTimeout(fail, 12000);
    v.onerror = () => { clearTimeout(timer); fail(); };
    v.onloadeddata = () => { v.currentTime = Math.min(0.3, (v.duration || 1) / 3); };
    v.onseeked = () => {
      clearTimeout(timer);
      const w = Math.min(1080, v.videoWidth), h = Math.round((v.videoHeight / v.videoWidth) * w);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(v, 0, 0, w, h);
      c.toBlob((b) => { URL.revokeObjectURL(url); resolve({ poster: b, duration: v.duration }); }, 'image/jpeg', 0.85);
    };
  });
}

export function HeroVideoField({ current, poster, custom }: { current: string; poster: string; custom: boolean }) {
  const [src, setSrc] = useState(current);
  const [pst, setPst] = useState(poster);
  const [isCustom, setCustom] = useState(custom);
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(f: File | undefined) {
    if (!f) return;
    setMsg(null);
    const mime = f.type || (/\.mov$/i.test(f.name) ? 'video/quicktime' : /\.webm$/i.test(f.name) ? 'video/webm' : 'video/mp4');
    let info: { poster: Blob | null; duration: number };
    try { info = await inspect(f); } catch {
      return setMsg({ ok: false, text: 'Este video no se puede reproducir en la web. En iPhone: Ajustes → Cámara → Formatos → “Más compatible” y grabalo de nuevo, o mandalo en MP4.' });
    }
    if (info.duration > 40) return setMsg({ ok: false, text: 'El video dura más de 40 segundos. Para la portada conviene uno corto (5 a 15 segundos).' });
    setPct(0);
    try {
      const s = await startVideoUploadAction(mime, f.size);
      if (!s.id) throw new Error(s.error);
      for (let off = 0, i = 0; off < f.size; off += PART, i++) {
        const fd = new FormData(); fd.append('id', s.id); fd.append('chunk', f.slice(off, off + PART), `p${i}`);
        const r = await appendVideoChunkAction(fd);
        if (!r.ok) throw new Error(r.error);
        setPct(Math.round(((off + PART) / f.size) * 100));
      }
      let posterId: string | null = null;
      if (info.poster) { const fd = new FormData(); fd.append('file', info.poster, 'portada.jpg'); posterId = (await uploadImageAction(fd)).id ?? null; }
      const done = await finishVideoUploadAction(s.id, posterId);
      if (!done.ok) throw new Error(done.error);
      setSrc(`/media/${s.id}`); setPst(posterId ? `/img/${posterId}` : pst); setCustom(true);
      setMsg({ ok: true, text: `¡Listo! Ya está en la portada.${mime === 'video/quicktime' ? ' Si es un video de iPhone en formato “Alta eficiencia”, algunos Android van a ver solo la imagen de portada: para que lo vean todos, grabalo en “Más compatible”.' : ''}` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error && e.message ? e.message : 'No se pudo subir el video.' });
    } finally {
      setPct(null);
      if (input.current) input.current.value = '';
    }
  }

  async function reset() {
    await resetHeroVideoAction();
    setSrc('/video/nexo-entrada.mp4'); setPst('/video/nexo-entrada.jpg'); setCustom(false);
    setMsg({ ok: true, text: 'Volvió el video original.' });
  }

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-2 font-semibold text-gray-800"><Film className="size-4" /> Video de la entrada</span>
      <div className="flex flex-wrap items-start gap-4">
        <video key={src} src={src} poster={pst} muted loop playsInline autoPlay className="aspect-[9/16] w-36 rounded-xl bg-black object-cover shadow" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-gray-600">Un video corto y vertical de la entrada o del local (5 a 15 segundos). Se ve sin sonido, en loop, y con el cartel de bienvenida encima. Hasta 40 MB.</p>
          <button type="button" onClick={() => input.current?.click()} disabled={pct != null} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 font-semibold text-white hover:bg-coal disabled:opacity-60">
            {pct != null ? <><Loader2 className="size-4 animate-spin" /> Subiendo… {Math.min(pct, 100)}%</> : <><Upload className="size-4" /> Cambiar video</>}
          </button>
          {isCustom && <button type="button" onClick={reset} className="ml-2 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"><RotateCcw className="size-4" /> Volver al original</button>}
          <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm" className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid="hero-video-file" />
          {msg && <p role="status" className={`text-sm font-medium ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}
