'use client';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCheck, Copy, Download, ExternalLink, Loader2, Pencil, Share2 } from 'lucide-react';
import { markSharedAction } from '@/app/admin/actions';
import { InstagramIcon, WhatsAppIcon } from '@/components/icons';
import { buildByTemplate, TEMPLATES, type ShareProductData, type Template } from '@/lib/share-text';
export type { ShareProductData } from '@/lib/share-text';

type Fmt = 'foto' | 'post' | 'story';
const FORMATS: [Fmt, string][] = [['foto', 'Foto del producto'], ['post', 'Imagen con precio y logo'], ['story', 'Estado (9:16)']];

/** Formato de WhatsApp: *negrita*, _cursiva_, ~tachado~. */
function waFormat(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /([*_~])([^*_~\n]+?)\1/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const inner = m[2];
    out.push(m[1] === '*' ? <b key={k++}>{inner}</b> : m[1] === '_' ? <i key={k++}>{inner}</i> : <s key={k++}>{inner}</s>);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/** Vista previa de cómo se ve la publicación en el canal. */
export function WhatsAppPreview({ image, text, tall }: { image?: string; text: string; tall?: boolean }) {
  const [time, setTime] = useState('');
  useEffect(() => setTime(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })), []);
  return (
    <div className="rounded-3xl bg-[#0b141a] bg-[radial-gradient(circle_at_20%_10%,#1b2a33_0,transparent_45%),radial-gradient(circle_at_80%_90%,#16232b_0,transparent_45%)] p-3 sm:p-5">
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-white/40">Así se ve en tu canal</p>
      <div className="mx-auto max-w-[380px] overflow-hidden rounded-2xl bg-[#202c33] shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="Foto de la publicación" className={`w-full bg-white object-cover ${tall ? 'aspect-[9/16]' : ''}`} />}
        <div className="px-3 pb-2 pt-2.5 text-[15px] leading-snug text-[#e9edef]">
          {text.split('\n').map((l, i) => (
            <Fragment key={i}>{l ? <p className="break-words">{waFormat(l)}</p> : <p className="h-[1.1em]" />}</Fragment>
          ))}
          <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-white/45">{time} <CheckCheck className="size-3.5 text-sky-400" /></p>
        </div>
      </div>
    </div>
  );
}

export function ShareKit({ products, initialText, channelUrl, siteUrl, link, templates }: {
  products: ShareProductData[]; initialText: string; channelUrl: string | null; siteUrl: string;
  /** Si se pasa, muestra las plantillas de texto (Clásica, Oferta flash, Corta). */
  templates?: boolean;
  /** Línea opcional "👉 Pedilo acá: …" (solo al compartir un producto). */
  link?: string;
}) {
  const single = products.length === 1;
  const [format, setFormat] = useState<Fmt>(single ? 'foto' : 'post');
  const [text, setText] = useState(initialText);
  const [withLink, setWithLink] = useState(false);
  const [tpl, setTpl] = useState<Template>('clasica');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const router = useRouter();
  const ids = products.map((p) => p.id).join(',');
  useEffect(() => setText(initialText), [initialText]);
  useEffect(() => {
    try {
      const f = new File([new Blob(['x'], { type: 'image/jpeg' })], 'x.jpg', { type: 'image/jpeg' });
      setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
    } catch { setCanShareFiles(false); }
  }, []);
  const finalText = withLink && link && tpl !== 'corta' ? `${text.trimEnd()}\n\n${link}` : text;
  function chooseTemplate(t: Template) {
    setTpl(t);
    setText(buildByTemplate(t, products[0], siteUrl));
    if (t === 'oferta') setFormat('post');
  }
  const urls = useMemo(() => products.map((p) => `/compartir/${p.id}?f=${format}&t=${encodeURIComponent(String(p.price ?? ''))}`), [products, format]);

  async function files() {
    return Promise.all(products.map(async (p, i) => {
      const r = await fetch(urls[i]);
      if (!r.ok) throw new Error('No se pudo preparar la imagen.');
      const b = await r.blob();
      const jpg = b.type === 'image/jpeg';
      return new File([b], `${p.slug}.${jpg ? 'jpg' : 'png'}`, { type: jpg ? 'image/jpeg' : 'image/png' });
    }));
  }

  async function markShared() {
    await markSharedAction(products.map((p) => p.id));
    router.refresh();
  }

  async function copyText(silent = false) {
    try {
      await navigator.clipboard.writeText(finalText);
      if (!silent) setStatus('Texto copiado ✓');
      return true;
    } catch { return false; }
  }

  function download(f: File) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function shareAll() {
    setBusy(true);
    setStatus(null);
    // Se abre antes de esperar, para que el navegador no lo bloquee (computadora sin "compartir").
    const win = !canShareFiles ? window.open('about:blank', '_blank') : null;
    try {
      await copyText(true); // por si WhatsApp no pega el texto junto a la foto
      const fs = await files();
      if (canShareFiles && navigator.canShare?.({ files: fs })) {
        await navigator.share({ files: fs, text: finalText });
        await markShared();
        setStatus('¡Listo! Si el texto no apareció debajo de la foto, mantené apretado y tocá “Pegar”: ya está copiado.');
      } else {
        fs.forEach(download);
        const target = channelUrl || `https://wa.me/?text=${encodeURIComponent(finalText)}`;
        if (win) win.location.href = target; else window.open(target, '_blank');
        await markShared();
        setStatus(channelUrl
          ? 'Descargamos la foto y copiamos el texto. En tu canal tocá 📎, elegí la foto y pegá el texto.'
          : 'Descargamos la foto y copiamos el texto. Se abrió WhatsApp: adjuntá la foto y pegá el texto.');
      }
    } catch (e) {
      win?.close();
      if ((e as Error).name !== 'AbortError') setStatus((e as Error).message || 'No se pudo compartir.');
    } finally {
      setBusy(false);
    }
  }

  /** Historia de Instagram: imagen 9:16 con la foto recortada, el precio y el logo, con márgenes para la interfaz de Instagram. */
  async function shareInstagram() {
    setBusy(true);
    setStatus(null);
    const productUrl = single ? `${siteUrl.replace(/\/$/, '')}/producto/${products[0].slug}` : siteUrl;
    try {
      try { await navigator.clipboard.writeText(productUrl); } catch { /* */ }
      const fs = await Promise.all(products.map(async (p) => {
        const r = await fetch(`/compartir/${p.id}?f=ig&t=${encodeURIComponent(String(p.price ?? ''))}`);
        if (!r.ok) throw new Error('No se pudo preparar la imagen.');
        return new File([await r.blob()], `${p.slug}-historia.png`, { type: 'image/png' });
      }));
      if (canShareFiles && navigator.canShare?.({ files: fs })) {
        await navigator.share({ files: fs }); // solo la imagen: así Instagram ofrece "Historias"
        setStatus('Elegí Instagram → Historias. El enlace del producto quedó copiado: sumalo con el sticker "Enlace" para que te pidan desde la web.');
      } else {
        fs.forEach(download);
        setStatus('Bajamos la imagen de la historia. Pasala al celular y subila desde Instagram → Tu historia. El enlace del producto quedó copiado para el sticker "Enlace".');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setStatus((e as Error).message || 'No se pudo compartir.');
    } finally {
      setBusy(false);
    }
  }

  const shareLabel = canShareFiles
    ? (single ? 'Compartir en mi canal' : `Compartir ${products.length} fotos + texto`)
    : 'Copiar texto, bajar foto y abrir WhatsApp';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de imagen">
        {FORMATS.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={format === v} onClick={() => setFormat(v)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${format === v ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white hover:border-gray-400'}`}>{l}</button>
        ))}
      </div>

      {templates && single && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-gray-600">Plantilla del texto</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Plantilla">
            {TEMPLATES.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={tpl === v} onClick={() => chooseTemplate(v)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${tpl === v ? 'border-gold-deep bg-gold text-ink' : 'border-gray-300 bg-white hover:border-gray-400'}`}>{l}</button>
            ))}
          </div>
        </div>
      )}
      <div className={single ? 'grid items-start gap-5 lg:grid-cols-[minmax(0,420px)_1fr]' : 'space-y-5'}>
        {single ? (
          <WhatsAppPreview key={urls[0]} image={urls[0]} text={finalText} tall={format === 'story'} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" key={ids + format}>
            {urls.map((u, i) => (
              <a key={u} href={u} target="_blank" className={`relative block overflow-hidden rounded-2xl border border-gray-200 bg-ink shadow-sm ${format === 'story' ? 'aspect-[9/16]' : format === 'post' ? 'aspect-[4/5]' : 'aspect-square bg-white'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Imagen para compartir: ${products[i].name}`} className="size-full object-contain" />
              </a>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <button type="button" onClick={shareAll} disabled={busy} className="hidden w-full items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-6 py-4 lg:flex text-lg font-bold text-white shadow-sm transition hover:bg-[#1da851] active:scale-[.98] disabled:opacity-60">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <WhatsAppIcon className="size-6" />}
            {shareLabel}
          </button>

          <button type="button" onClick={shareInstagram} disabled={busy} data-testid="share-instagram" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[.98] disabled:opacity-60">
            <InstagramIcon className="size-5" /> {single ? 'Subir a mi historia de Instagram' : `Subir ${products.length} historias a Instagram`}
          </button>

          {link && tpl !== 'corta' && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm">
              <input type="checkbox" checked={withLink} onChange={(e) => setWithLink(e.target.checked)} className="size-5 accent-[#25d366]" />
              <span><b>Agregar enlace para pedir por la web</b><span className="block text-gray-500">Suma al final “👉 Pedilo acá: …”</span></span>
            </label>
          )}

          {single && !editing ? (
            <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold hover:bg-gray-50"><Pencil className="size-4" /> Cambiar el texto</button>
          ) : (
            <label className="block">
              <span className="mb-1.5 block font-semibold text-gray-800">Texto de la publicación</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(16, text.split('\n').length + 1)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] leading-snug outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30" />
              <span className="mt-1 block text-sm text-gray-500">Cambiá lo que quieras: la vista previa se actualiza sola. *texto* sale en negrita. Para que quede guardado para la próxima, cargalo en el producto (sección “Publicación para el canal”).</span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => copyText()} className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-3 font-semibold hover:bg-gray-50"><Copy className="size-4" /> Copiar texto</button>
            <button type="button" onClick={async () => { setBusy(true); try { (await files()).forEach(download); } finally { setBusy(false); } }} className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-3 font-semibold hover:bg-gray-50"><Download className="size-4" /> Bajar foto{single ? '' : 's'}</button>
            {channelUrl ? (
              <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 font-semibold text-emerald-800 hover:bg-emerald-100 sm:col-span-1"><ExternalLink className="size-4" /> Abrir mi canal</a>
            ) : (
              <a href="/admin/negocio?tab=contacto" className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-sm font-semibold text-gray-500 sm:col-span-1">Cargar link del canal</a>
            )}
          </div>
          {status && <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><Check className="mt-0.5 size-4 shrink-0" /> {status}</p>}

          <details className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
            <summary className="cursor-pointer font-semibold text-gray-900"><Share2 className="mr-1 inline size-4" /> ¿Cómo llega a mi canal?</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5">
              <li>Tocá <b>{canShareFiles || !single ? 'Compartir en mi canal' : 'el botón verde'}</b>. En el celular se abre el menú de compartir: elegí <b>WhatsApp</b>.</li>
              <li>En la lista, arriba en <b>Canales</b>, tocá tu canal. Te aparece la foto con el texto abajo, como en la vista previa. Tocá enviar.</li>
              <li>Si tu canal no aparece en la lista: <b>Bajar foto</b> + <b>Copiar texto</b>, después <b>Abrir mi canal</b>, tocá el clip 📎, elegí la foto y pegá el texto.</li>
            </ol>
            <p className="mt-3"><b>Instagram:</b> el botón violeta arma la historia (9:16, con la foto sin fondo, el precio y el logo, dejando libre la parte de arriba y de abajo que tapa Instagram). En el menú de compartir elegí <b>Instagram → Historias</b> y publicá. El enlace del producto queda copiado para sumarlo con el sticker <b>Enlace</b>.</p>
            <p className="mt-3 text-gray-500">WhatsApp no permite que ninguna página publique sola en un canal: siempre hace falta tu toque de “Enviar”. Lo que hacemos es dejarte la foto y el texto listos para que sea un solo paso.</p>
          </details>
        </div>
      </div>
      <p className="sr-only">{siteUrl}</p>
      {/* Botón verde: queda pegado abajo mientras ves esta parte, y al final se acomoda en su lugar (no tapa nada) */}
      <div className="sticky bottom-[5.5rem] z-30 lg:hidden">
        <button type="button" onClick={shareAll} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-5 py-3.5 text-base font-bold text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,.45)] transition active:scale-[.98] disabled:opacity-60">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <WhatsAppIcon className="size-5" />}
          {shareLabel}
        </button>
      </div>
    </div>
  );
}
