'use client';
import { useActionState } from 'react';
import { CircleAlert, Loader2, UserPlus } from 'lucide-react';
import { activateAction } from '../account-actions';
import { inputCls } from '@/components/admin/fields';

export function ActivateForm({ token, defaultName = '' }: { token: string; defaultName?: string }) {
  const [state, action, pending] = useActionState(activateAction, undefined);
  const ring = (f: string) => (state?.field === f ? ' ring-2 ring-red-500' : '');
  return (
    <form key={JSON.stringify(state?.values ?? {})} action={action} className="mt-6 space-y-5">
      <input type="hidden" name="c" value={token} />
      {state?.error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <CircleAlert className="mt-0.5 size-5 shrink-0" /> <p>{state.error}</p>
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Tu nombre</span>
        <input name="display_name" defaultValue={state?.values?.display_name ?? defaultName} autoComplete="name" maxLength={60} placeholder="Ej: Martín" className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Usuario para entrar</span>
        <input name="username" defaultValue={state?.values?.username} required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Ej: martin" className={inputCls + ring('username')} />
        <span className="mt-1.5 block text-sm text-gray-500">Sin espacios ni tildes.</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Contraseña</span>
        <input name="password" type="password" required autoComplete="new-password" className={inputCls + ring('password')} />
        <span className="mt-1.5 block text-sm text-gray-500">Mínimo 8 caracteres, con letras y números.</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Repetir contraseña</span>
        <input name="confirm" type="password" required autoComplete="new-password" className={inputCls} />
      </label>
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-4 text-lg font-bold text-ink transition hover:bg-gold-deep disabled:opacity-60">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />} Crear mi cuenta
      </button>
    </form>
  );
}
