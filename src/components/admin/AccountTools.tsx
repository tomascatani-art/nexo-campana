'use client';
import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CircleAlert, Copy, KeyRound, Link2, Loader2, ShieldCheck, Unlink, X } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';
import { cancelInviteAction, createInviteAction, regenerateRecoveryAction, unlinkGoogleAction, type AccountState } from '@/app/admin/account-actions';
import { Flash } from './ui';

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); } catch { /* sin permiso: queda a la vista para copiar a mano */ }
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 hover:bg-gray-50"
    >
      {done ? <Check className="size-5 text-emerald-600" /> : <Copy className="size-5" />} {done ? 'Copiado' : label}
    </button>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      <CircleAlert className="mt-0.5 size-5 shrink-0" /> <p>{text}</p>
    </div>
  );
}

/** Muestra un código de recuperación para anotar. */
export function RecoveryCodeBox({ code }: { code: string }) {
  return (
    <div className="rounded-2xl border-2 border-gold bg-gold/10 p-5">
      <p className="flex items-center gap-2 font-bold text-gray-900"><KeyRound className="size-5" /> Tu código de recuperación</p>
      <p className="mt-3 select-all break-all rounded-xl bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-wider text-gray-900">{code}</p>
      <p className="mt-3 text-sm text-gray-700">
        Anotalo en un papel o sacale una captura y guardala. Sirve para entrar si algún día te olvidás la contraseña o no podés usar Google.
        <strong> Se muestra una sola vez</strong> y nadie más lo tiene.
      </p>
      <div className="mt-3"><CopyButton text={code} label="Copiar código" /></div>
    </div>
  );
}

/** Link de activación para el dueño. */
export function InviteTool({ pendingUntil }: { pendingUntil: string | null }) {
  const [state, setState] = useState<AccountState>(undefined);
  const [busy, start] = useTransition();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const link = state?.link;
  const wa = link ? `https://wa.me/?text=${encodeURIComponent(`Hola! Este es el link para crear tu cuenta del panel de NEXO. Abrilo y creá tu usuario (o entrá con Google). Vence en 3 días y sirve una sola vez:\n${link}`)}` : '';

  const run = (fn: () => Promise<AccountState>) => start(async () => { setState(await fn()); setConfirming(false); router.refresh(); });

  if (link) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-600">Link de activación (vence en 3 días, sirve una sola vez):</p>
          <p className="mt-2 select-all break-all font-mono text-sm text-gray-900">{link}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-bold text-white hover:brightness-95">
            <WhatsAppIcon className="size-5" /> Mandar por WhatsApp
          </a>
          <CopyButton text={link} label="Copiar link" />
        </div>
        <p className="text-sm text-gray-500">Este link no se vuelve a mostrar. Si lo perdés, generá otro (el anterior deja de servir).</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {state?.error && <ErrorBox text={state.error} />}
      {state?.ok && state.message && <Flash message={state.message} />}
      {pendingUntil && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
          <p className="flex-1">Hay un link de activación sin usar, vence el {pendingUntil}.</p>
          <button type="button" disabled={busy} onClick={() => run(cancelInviteAction)} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 font-semibold hover:bg-amber-100">
            <X className="size-4" /> Anular
          </button>
        </div>
      )}
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 font-bold text-ink hover:bg-gold-deep">
          <Link2 className="size-5" /> {pendingUntil ? 'Generar un link nuevo' : 'Generar link de activación'}
        </button>
      ) : (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-900">¿Seguro?</p>
          <p className="mt-1 text-red-900">Cuando el dueño use el link y cree su cuenta, <strong>todos los usuarios actuales del panel se borran, incluido el tuyo</strong>. Vas a quedar afuera.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(createInviteAction)} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-ink hover:bg-gold-deep disabled:opacity-60">
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />} Sí, generar el link
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RegenerateRecovery() {
  const [state, action, busy] = useActionState(regenerateRecoveryAction, undefined);
  const [confirming, setConfirming] = useState(false);
  if (state?.code) return <RecoveryCodeBox code={state.code} />;
  return confirming ? (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <p className="w-full text-gray-700">El código anterior va a dejar de servir.</p>
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-ink hover:bg-gold-deep disabled:opacity-60">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />} Sí, crear código nuevo
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700">Cancelar</button>
    </form>
  ) : (
    <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 hover:bg-gray-50">
      <KeyRound className="size-5" /> Crear un código de recuperación nuevo
    </button>
  );
}

export function UnlinkGoogle() {
  const [state, action, busy] = useActionState(unlinkGoogleAction, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <ErrorBox text={state.error} />}
      {state?.ok && state.message && <Flash message={state.message} />}
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50">
        <Unlink className="size-4" /> Desvincular Google
      </button>
    </form>
  );
}

export function GoogleButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-4 text-lg font-bold text-gray-800 shadow-sm transition hover:bg-gray-50">
      <GoogleG /> {children}
    </a>
  );
}

export function GoogleG({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SecureBadge({ text }: { text: string }) {
  return <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"><ShieldCheck className="size-5 shrink-0" /> {text}</p>;
}
