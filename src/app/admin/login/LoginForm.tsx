'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CircleAlert, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { loginAction } from '../actions';
import { inputCls } from '@/components/admin/fields';

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="mt-8 space-y-5">
      {state?.error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <CircleAlert className="mt-0.5 size-5 shrink-0" /> <p>{state.error}</p>
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Usuario</span>
        <input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-semibold text-gray-800">Contraseña</span>
        <span className="relative block">
          <input name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required className={`${inputCls} pr-12`} />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </span>
      </label>
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-4 text-lg font-bold text-ink transition hover:bg-gold-deep disabled:opacity-60">
      {pending ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />} Ingresar
    </button>
  );
}
