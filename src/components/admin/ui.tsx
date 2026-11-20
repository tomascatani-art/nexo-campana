'use client';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Check, CircleAlert, CircleCheck, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import {
  deleteItemAction, moveItemAction, toggleFlagAction, updatePriceAction, uploadImageAction, type FormState,
} from '@/app/admin/actions';

// ------------------------------------------------------------------ Formulario con mensajes
export function AdminForm({
  action, children, className = '', resetOnSuccess = false,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const sent = useRef<[string, FormDataEntryValue][] | null>(null);
  const router = useRouter();
  useEffect(() => {
    const form = ref.current;
    // Si hubo un error, React vacía el formulario: le volvemos a poner lo que había escrito
    if (state?.error && form && sent.current) restoreForm(form, sent.current);
    form?.querySelectorAll('[data-field-error]').forEach((n) => n.remove());
    form?.querySelectorAll('.field-error-ring').forEach((n) => n.classList.remove('field-error-ring', 'ring-2', 'ring-red-500'));
    if (state?.error) {
      // Si sabemos qué campo falta o está mal, lo marcamos en rojo, ponemos el aviso abajo y vamos ahí
      const input = state.field ? form?.querySelector<HTMLElement>(`[name="${CSS.escape(state.field)}"]:not([type=hidden])`) : null;
      if (input) {
        input.classList.add('field-error-ring', 'ring-2', 'ring-red-500');
        const note = document.createElement('p');
        note.dataset.fieldError = '1';
        note.className = 'mt-2 text-sm font-semibold text-red-600';
        note.textContent = `⚠️ ${state.error}`;
        input.insertAdjacentElement('afterend', note);
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus({ preventScroll: true }), 400);
      } else form?.querySelector('[role=alert]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      router.refresh();
    }
  }, [state, resetOnSuccess, router]);
  return (
    <form ref={ref} action={formAction} onSubmit={(e) => { sent.current = [...new FormData(e.currentTarget).entries()]; }} className={className}>
      {state?.error && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <CircleAlert className="mt-0.5 size-5 shrink-0" /> <p>{state.error}</p>
        </div>
      )}
      {state?.ok && state.message && <Flash message={state.message} />}
      {children}
    </form>
  );
}

/** Vuelve a cargar en el formulario los valores que se enviaron (texto, números, selects y casillas). */
function restoreForm(form: HTMLFormElement, entries: [string, FormDataEntryValue][]) {
  const byName = new Map<string, string[]>();
  for (const [k, v] of entries) if (typeof v === 'string') byName.set(k, [...(byName.get(k) ?? []), v]);
  const seen = new Map<string, number>();
  for (const el of Array.from(form.elements)) {
    const input = el as HTMLInputElement;
    if (!input.name || input.type === 'file' || input.type === 'submit' || input.type === 'button') continue;
    const vals = byName.get(input.name) ?? [];
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = vals.includes(input.value || 'on');
      continue;
    }
    const i = seen.get(input.name) ?? 0;
    seen.set(input.name, i + 1);
    if (i < vals.length && input.value !== vals[i]) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, vals[i]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

export function Flash({ message }: { message: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, [message]);
  if (!show) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-emerald-600 p-4 text-white shadow-2xl lg:bottom-8">
      <CircleCheck className="size-6 shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      <button type="button" onClick={() => setShow(false)} aria-label="Cerrar aviso" className="rounded-full p-1 hover:bg-white/20"><X className="size-4" /></button>
    </div>
  );
}

export function SubmitButton({ children = 'Guardar cambios', className = '' }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-base font-bold text-ink shadow-sm transition hover:bg-gold-deep disabled:opacity-60 ${className}`}>
      {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
      {pending ? 'Guardando…' : children}
    </button>
  );
}

// ------------------------------------------------------------------ Foto
export function ImageField({ name, label, defaultId, aspect = 'aspect-video', help }: { name: string; label: string; defaultId: string | null; aspect?: string; help?: string }) {
  const [id, setId] = useState<string | null>(defaultId);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      const resized = await resizeImage(f, 2000);
      setPreview(URL.createObjectURL(resized));
      const fd = new FormData();
      fd.append('file', resized, 'foto.jpg');
      const r = await uploadImageAction(fd);
      if (r.error || !r.id) throw new Error(r.error || 'No se pudo subir la imagen.');
      setId(r.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
      setPreview(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const src = preview ?? (id ? `/img/${id}` : null);
  return (
    <div>
      <span className="mb-1.5 block font-semibold text-gray-800">{label}</span>
      <input type="hidden" name={name} value={id ?? ''} />
      <div className={`relative overflow-hidden rounded-xl border-2 border-dashed ${src ? 'border-gray-200' : 'border-gray-300'} bg-gray-50 ${aspect} max-w-md`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gold-deep">
            <ImagePlus className="size-8" />
            <span className="font-semibold">Tocá para sacar o elegir una foto</span>
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-8 animate-spin text-gold-deep" />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-800 hover:border-gold-deep hover:text-ink disabled:opacity-50">
          <ImagePlus className="size-4" /> {src ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {src && (
          <button type="button" onClick={() => { setId(null); setPreview(null); }} disabled={busy} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-gray-600 hover:bg-gray-100">
            <X className="size-4" /> Quitar
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {help && <p className="mt-1.5 text-sm text-gray-500">{help}</p>}
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ Fotos extra (galería)
export function GalleryField({ name, defaultIds, max = 5 }: { name: string; defaultIds: string[]; max?: number }) {
  const [ids, setIds] = useState<string[]>(defaultIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      for (const f of Array.from(files).slice(0, max - ids.length)) {
        const resized = await resizeImage(f, 2000);
        const fd = new FormData();
        fd.append('file', resized, 'foto.jpg');
        const r = await uploadImageAction(fd);
        if (r.error || !r.id) throw new Error(r.error || 'No se pudo subir la imagen.');
        setIds((cur) => [...cur, r.id!]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <div>
      <span className="mb-1.5 block font-semibold text-gray-800">Más fotos (opcional)</span>
      {ids.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <div className="flex flex-wrap gap-2">
        {ids.map((id, i) => (
          <div key={id} className="relative size-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/${id}`} alt={`Foto extra ${i + 1}`} className="size-full object-cover" />
            <button type="button" onClick={() => setIds(ids.filter((x) => x !== id))} aria-label="Quitar foto" className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="size-3.5" /></button>
          </div>
        ))}
        {ids.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-gold-deep hover:text-ink">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />} Agregar
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <p className="mt-1.5 text-sm text-gray-500">Hasta {max} fotos más: otros ángulos, la caja, detalles.</p>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

/** Achica fotos grandes del celular antes de subirlas (más rápido y liviano). */
async function resizeImage(file: File, max: number): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo elegido no es una imagen.');
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 3_000_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88));
    return blob ?? file;
  } catch {
    return file; // el servidor la procesa igual
  }
}

// ------------------------------------------------------------------ Interruptor (activar / destacar)
export function Toggle({ table, id, field, value, label, onLabel, offLabel }: { table: string; id: string; field: string; value: boolean; label: string; onLabel?: string; offLabel?: string }) {
  const [on, setOn] = useState(value);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => setOn(value), [value]);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          try {
            await toggleFlagAction(table, id, field, next);
            router.refresh();
          } catch {
            setOn(!next);
          }
        });
      }}
      className="group inline-flex items-center gap-2 text-sm font-semibold"
    >
      <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${on ? 'bg-emerald-500' : 'bg-gray-300'} ${pending ? 'opacity-60' : ''}`}>
        <span className={`inline-block size-5 rounded-full bg-white shadow transition ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </span>
      <span className={on ? 'text-gray-900' : 'text-gray-500'}>{on ? onLabel ?? label : offLabel ?? label}</span>
    </button>
  );
}

// ------------------------------------------------------------------ Eliminar con confirmación
export function DeleteButton({ table, id, name, redirectTo, compact }: { table: string; id: string; name: string; redirectTo?: string; compact?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={`inline-flex items-center gap-2 rounded-lg font-semibold text-red-600 hover:bg-red-50 ${compact ? 'p-2.5' : 'px-4 py-2.5'}`} aria-label={`Eliminar ${name}`}>
        <Trash2 className="size-5" /> {!compact && 'Eliminar'}
      </button>
      <dialog ref={ref} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-2xl backdrop:bg-black/50">
        <div className="p-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600"><Trash2 className="size-6" /></div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">¿Eliminar “{name}”?</h2>
          <p className="mt-2 text-gray-600">Se va a borrar de forma permanente y dejará de verse en la web. Si solo querés ocultarlo por un tiempo, usá el interruptor <strong>Visible</strong>.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => ref.current?.close()} className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-50">Cancelar</button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteItemAction(table, id);
                  ref.current?.close();
                  if (redirectTo) router.push(redirectTo + '?ok=' + encodeURIComponent('Eliminado correctamente'));
                  else router.refresh();
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />} Sí, eliminar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

// ------------------------------------------------------------------ Ordenar
export function MoveButtons({ table, id, first, last }: { table: string; id: string; first: boolean; last: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const move = (d: 'up' | 'down') => start(async () => { await moveItemAction(table, id, d); router.refresh(); });
  return (
    <div className="flex flex-col">
      <button type="button" disabled={first || pending} onClick={() => move('up')} aria-label="Subir" className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-25"><ArrowUp className="size-4" /></button>
      <button type="button" disabled={last || pending} onClick={() => move('down')} aria-label="Bajar" className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-25"><ArrowDown className="size-4" /></button>
    </div>
  );
}

// ------------------------------------------------------------------ Precio editable en el lugar
export function PriceEditor({ table, id, field, value, label }: { table: string; id: string; field: string; value: number | null; label: string }) {
  const fmt = (n: number | null) => (n == null ? '' : n.toLocaleString('es-AR', { maximumFractionDigits: 2 }));
  const [val, setVal] = useState(fmt(value));
  const [saved, setSaved] = useState(fmt(value));
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [err, setErr] = useState('');
  const dirty = val !== saved;

  async function save() {
    setStatus('saving');
    const r = await updatePriceAction(table, id, field, val);
    if (r.ok) {
      const f = fmt(r.value ?? null);
      setVal(f);
      setSaved(f);
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 2500);
    } else {
      setErr(r.error || 'Error');
      setStatus('error');
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      className="flex items-center gap-2"
    >
      <label className="relative">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-gray-500">$</span>
        <input
          value={val}
          onChange={(e) => { setVal(e.target.value.replace(/[^\d.,]/g, '')); setStatus('idle'); }}
          inputMode="decimal"
          placeholder="Sin precio"
          className={`w-36 rounded-xl border bg-white py-2.5 pl-7 pr-3 text-right text-lg font-bold tabular-nums outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30 ${status === 'error' ? 'border-red-400' : dirty ? 'border-amber-400' : 'border-gray-300'}`}
        />
      </label>
      <button type="submit" disabled={!dirty || status === 'saving'} className="inline-flex h-11 min-w-24 items-center justify-center gap-1.5 rounded-xl bg-gold px-3 font-bold text-ink transition hover:bg-gold-deep disabled:bg-gray-200 disabled:text-gray-500">
        {status === 'saving' ? <Loader2 className="size-4 animate-spin" /> : status === 'ok' ? <><Check className="size-4" /> Listo</> : 'Guardar'}
      </button>
      {status === 'error' && <span className="text-sm text-red-600">{err}</span>}
    </form>
  );
}
