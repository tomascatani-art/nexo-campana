'use client';
import { useActionState } from 'react';
import { CircleAlert, KeyRound, Loader2 } from 'lucide-react';
import { recoverAction } from '../account-actions';
import { inputCls } from '@/components/admin/fields';
import { RecoveryCodeBox } from '@/components/admin/AccountTools';

export function RecoverForm() {
  const [state, action, pending] = useActionState(recoverAction, undefined);
  if (state?.ok && state.code) {
    return (
      <div className="mt-6 space-y-5">
        <p className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">Listo: tu contraseña nueva ya funciona. El código que usaste dejó de servir; este es el nuevo:</p>
        <RecoveryCodeBox code={state.code} />
        <a href="/admin" className="flex w-full items-center justify-center rounded-xl bg-gold py-4 text-lg font-bold text-ink hover:bg-gold-deep">Ya lo guardé, ir al panel</a>
      </div>
    );
  }
  return (
    <form key={JSON.stringify(state?.values ?? {})} action={action} className="mt-6 space-y-5">
      {state?.error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <CircleAlert className="mt-0.5 size-5 shrink-0" /> <p>{state.error}</p>
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Usuario o mail de Google</span>
        <input name="username" defaultValue={state?.values?.username} required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Código de recuperación</span>
        <input name="code" defaultValue={state?.values?.code} required autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" className={inputCls + ' font-mono uppercase'} />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Contraseña nueva</span>
        <input name="password" type="password" required autoComplete="new-password" className={inputCls} />
        <span className="mt-1.5 block text-sm text-gray-500">Mínimo 8 caracteres, con letras y números.</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Repetir contraseña nueva</span>
        <input name="confirm" type="password" required autoComplete="new-password" className={inputCls} />
      </label>
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-4 text-lg font-bold text-ink transition hover:bg-gold-deep disabled:opacity-60">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />} Cambiar contraseña
      </button>
      <a href="/admin/login" className="block text-center font-semibold text-gray-600 hover:text-gray-900">Volver a ingresar</a>
    </form>
  );
}
