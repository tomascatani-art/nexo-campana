'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  activateOwner, cancelInvites, createInvite, linkGoogle, passwordProblem, recoverWithCode, regenerateRecovery,
  requireAdmin, RECOVERY_COOKIE, usernameProblem,
} from '@/lib/auth';
import { requestOrigin, saveGoogleConfig } from '@/lib/google';

export type AccountState = { ok?: boolean; error?: string; field?: string; message?: string; link?: string; code?: string; values?: Record<string, string> } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '');

// ------------------------------------------------------------------ activar (sin sesión)
export async function activateAction(_: AccountState, fd: FormData): Promise<AccountState> {
  const token = str(fd, 'c');
  const username = str(fd, 'username').trim().toLowerCase();
  const display = str(fd, 'display_name').trim().slice(0, 60) || null;
  const password = str(fd, 'password');
  const values = { username: str(fd, 'username'), display_name: str(fd, 'display_name') };
  const uErr = usernameProblem(username);
  if (uErr) return { error: uErr, field: 'username', values };
  const pErr = passwordProblem(password, str(fd, 'confirm'));
  if (pErr) return { error: pErr, field: 'password', values };
  const r = await activateOwner(token, { username, display_name: display, password });
  if (!r.ok) return { error: r.error, values };
  redirect('/admin/cuenta?bienvenida=1');
}

// ------------------------------------------------------------------ recuperar (sin sesión)
export async function recoverAction(_: AccountState, fd: FormData): Promise<AccountState> {
  const username = str(fd, 'username');
  const code = str(fd, 'code');
  const password = str(fd, 'password');
  const values = { username, code };
  if (!username.trim() || !code.trim()) return { error: 'Completá tu usuario y el código de recuperación.', values };
  const pErr = passwordProblem(password, str(fd, 'confirm'));
  if (pErr) return { error: pErr, field: 'password', values };
  const r = await recoverWithCode(username, code, password);
  if (!r.ok) return { error: r.error, values };
  return { ok: true, code: r.code };
}

// ------------------------------------------------------------------ dentro del panel
export async function createInviteAction(): Promise<AccountState> {
  const user = await requireAdmin();
  const token = await createInvite(user);
  revalidatePath('/admin/cuenta');
  return { ok: true, link: `${await requestOrigin()}/admin/activar?c=${token}` };
}

export async function cancelInviteAction(): Promise<AccountState> {
  await requireAdmin();
  await cancelInvites();
  revalidatePath('/admin/cuenta');
  return { ok: true, message: 'Link anulado: ya no sirve para crear una cuenta.' };
}

export async function regenerateRecoveryAction(): Promise<AccountState> {
  const user = await requireAdmin();
  return { ok: true, code: await regenerateRecovery(user) };
}

export async function dismissRecoveryAction() {
  await requireAdmin();
  (await cookies()).delete({ name: RECOVERY_COOKIE, path: '/admin' });
  redirect('/admin/cuenta');
}

export async function unlinkGoogleAction(): Promise<AccountState> {
  const user = await requireAdmin();
  if (!user.has_password) return { error: 'Primero creá una contraseña: si no, no vas a poder entrar.' };
  await linkGoogle(user, null);
  revalidatePath('/admin/cuenta');
  return { ok: true, message: 'Google desvinculado. Entrás con usuario y contraseña.' };
}

export async function saveGoogleConfigAction(_: AccountState, fd: FormData): Promise<AccountState> {
  await requireAdmin();
  const id = str(fd, 'client_id').trim();
  const secret = str(fd, 'client_secret').trim();
  if (fd.get('borrar') === '1') {
    await saveGoogleConfig(null, null);
    revalidatePath('/admin', 'layout');
    return { ok: true, message: 'Ingreso con Google desactivado.' };
  }
  if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) return { error: 'El "ID de cliente" tiene que terminar en .apps.googleusercontent.com', field: 'client_id' };
  if (secret.length < 10 || /\s/.test(secret)) return { error: 'Revisá el "Secreto del cliente": copialo completo, sin espacios.', field: 'client_secret' };
  await saveGoogleConfig(id, secret);
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Listo: el botón "Entrar con Google" ya está activo.' };
}
