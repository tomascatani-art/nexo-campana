import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { sql } from './db';
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from './session';

export type AdminUser = { id: string; username: string; display_name: string | null; session_version: number };

const MAX_FAILED = 8;
const WINDOW_MIN = 15;
// Hash ficticio para que el tiempo de respuesta sea igual exista o no el usuario.
const DUMMY_HASH = '$2b$12$/Bz2EJBVm337s2IY.D0cUeLGSWjTfYHm33YZgTvFut.Wqb7NZMoUW';

export async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;
  const [u] = await sql<AdminUser[]>`
    select id, username, display_name, session_version from admin_users where id = ${payload.sub}`;
  if (!u || u.session_version !== payload.v) return null;
  return u;
}

/** Usar al comienzo de cada página y acción del panel. */
export async function requireAdmin(): Promise<AdminUser> {
  const u = await getCurrentAdmin();
  if (!u) redirect('/admin/login');
  return u;
}

export async function login(usernameRaw: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp();
  const username = usernameRaw.trim().toLowerCase();

  const [{ failed }] = await sql<{ failed: number }[]>`
    select count(*)::int as failed from login_attempts
    where ip = ${ip} and not success and created_at > now() - make_interval(mins => ${WINDOW_MIN})`;
  if (failed >= MAX_FAILED) {
    return { ok: false, error: `Demasiados intentos fallidos. Esperá ${WINDOW_MIN} minutos e intentá de nuevo.` };
  }

  const [u] = await sql<(AdminUser & { password_hash: string })[]>`
    select id, username, display_name, session_version, password_hash from admin_users where username = ${username}`;
  const valid = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  await sql`insert into login_attempts (ip, username, success) values (${ip}, ${username.slice(0, 80)}, ${!!(u && valid)})`;
  // Limpieza de registros viejos
  await sql`delete from login_attempts where created_at < now() - interval '30 days'`;

  if (!u || !valid) return { ok: false, error: 'Usuario o contraseña incorrectos.' };

  await sql`update admin_users set last_login_at = now() where id = ${u.id}`;
  await setSessionCookie(u.id, u.session_version);
  return { ok: true };
}

export async function setSessionCookie(userId: string, version: number) {
  const token = await signSession({ sub: userId, v: version });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function changePassword(user: AdminUser, current: string, next: string) {
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from admin_users where id = ${user.id}`;
  if (!row || !(await bcrypt.compare(current, row.password_hash))) {
    return { ok: false as const, error: 'La contraseña actual no es correcta.' };
  }
  const hash = await bcrypt.hash(next, 12);
  // Aumentar session_version cierra la sesión en todos los demás dispositivos.
  const [u] = await sql<{ session_version: number }[]>`
    update admin_users set password_hash = ${hash}, session_version = session_version + 1
    where id = ${user.id} returning session_version`;
  await setSessionCookie(user.id, u.session_version);
  return { ok: true as const };
}
