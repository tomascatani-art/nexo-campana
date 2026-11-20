import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { sql } from './db';
import { ensureAuthSchema } from './auth-schema';
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from './session';

export type AdminUser = { id: string; username: string; display_name: string | null; session_version: number; google_email: string | null; has_password: boolean };

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
  await ensureAuthSchema();
  const [u] = await sql<AdminUser[]>`select id, username, display_name, session_version, google_email, (password_hash is not null) as has_password from admin_users where id = ${payload.sub}`;
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
  await ensureAuthSchema();

  if (await tooManyFailures(ip)) {
    return { ok: false, error: `Demasiados intentos fallidos. Esperá ${WINDOW_MIN} minutos e intentá de nuevo.` };
  }

  const [u] = await sql<(AdminUser & { password_hash: string | null })[]>`
    select id, username, display_name, session_version, google_email, (password_hash is not null) as has_password, password_hash from admin_users where username = ${username}`;
  const valid = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  await sql`insert into login_attempts (ip, username, success) values (${ip}, ${username.slice(0, 80)}, ${!!(u && valid)})`;
  // Limpieza de registros viejos
  await sql`delete from login_attempts where created_at < now() - interval '30 days'`;

  if (!u || !valid || !u.password_hash) return { ok: false, error: 'Usuario o contraseña incorrectos.' };

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
  const [row] = await sql<{ password_hash: string | null }[]>`select password_hash from admin_users where id = ${user.id}`;
  // Quien entra solo con Google puede crear una contraseña sin escribir una "actual"
  if (!row || (row.password_hash && !(await bcrypt.compare(current, row.password_hash)))) {
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

// ------------------------------------------------------------------ cuenta del dueño

export async function tooManyFailures(ip: string) {
  const [{ failed }] = await sql<{ failed: number }[]>`
    select count(*)::int as failed from login_attempts
    where ip = ${ip} and not success and created_at > now() - make_interval(mins => ${WINDOW_MIN})`;
  return failed >= MAX_FAILED;
}

export async function recordAttempt(username: string, success: boolean) {
  await sql`insert into login_attempts (ip, username, success) values (${await clientIp()}, ${username.slice(0, 80)}, ${success})`;
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Valida la contraseña nueva. Devuelve el error o null. */
export function passwordProblem(p: string, confirm: string) {
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (p.length > 200) return 'La contraseña es demasiado larga.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Usá letras y números en la contraseña.';
  if (p !== confirm) return 'Las dos contraseñas no coinciden.';
  return null;
}

export function usernameProblem(u: string) {
  if (!/^[a-z0-9._-]{3,40}$/.test(u)) return 'El usuario tiene que tener entre 3 y 40 letras o números, sin espacios ni tildes (podés usar . _ -).';
  return null;
}

/** Código de recuperación fácil de anotar: 4 grupos de 4 (sin letras que se confunden). */
export function newRecoveryCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(16);
  const chars = Array.from(b, (x) => A[x % A.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
const recoveryHash = (c: string) => sha256('nexo-recovery:' + normCode(c));

/** Crea un link de activación nuevo (anula los anteriores). Devuelve el código secreto. */
export async function createInvite(by: AdminUser, hours = 72) {
  await ensureAuthSchema();
  const token = randomBytes(24).toString('base64url');
  await sql`delete from admin_invites where used_at is null`;
  await sql`insert into admin_invites (token_hash, created_by, expires_at)
            values (${sha256(token)}, ${by.username}, now() + make_interval(hours => ${hours}))`;
  return token;
}

export async function cancelInvites() {
  await ensureAuthSchema();
  await sql`delete from admin_invites where used_at is null`;
}

export async function getPendingInvite() {
  await ensureAuthSchema();
  const [r] = await sql<{ created_at: Date; expires_at: Date }[]>`
    select created_at, expires_at from admin_invites where used_at is null and expires_at > now() order by created_at desc limit 1`;
  return r ?? null;
}

export async function inviteIsValid(token: string) {
  if (!token || token.length > 100) return false;
  await ensureAuthSchema();
  const [r] = await sql`select 1 from admin_invites where token_hash = ${sha256(token)} and used_at is null and expires_at > now()`;
  return !!r;
}

export const RECOVERY_COOKIE = 'nexo_recovery';

/**
 * Activa la cuenta del dueño con un link de activación: crea su usuario y BORRA
 * todos los demás usuarios del panel (incluido el de quien hizo la web).
 */
export async function activateOwner(token: string, data: { username: string; display_name: string | null; password?: string; google_email?: string }) {
  await ensureAuthSchema();
  const hash = data.password ? await bcrypt.hash(data.password, 12) : null;
  const code = newRecoveryCode();
  const created = await sql.begin(async (tx) => {
    const [inv] = await tx<{ id: string }[]>`
      select id from admin_invites where token_hash = ${sha256(token)} and used_at is null and expires_at > now() for update`;
    if (!inv) return null;
    await tx`delete from admin_users`;
    const [u] = await tx<{ id: string; session_version: number }[]>`
      insert into admin_users (username, display_name, password_hash, google_email, recovery_hash, last_login_at)
      values (${data.username}, ${data.display_name}, ${hash}, ${data.google_email ?? null}, ${recoveryHash(code)}, now())
      returning id, session_version`;
    await tx`update admin_invites set used_at = now() where id = ${inv.id}`;
    await tx`delete from admin_invites where id <> ${inv.id}`;
    return u;
  });
  if (!created) return { ok: false as const, error: 'El link de activación ya se usó o venció. Pedí uno nuevo.' };
  await recordAttempt(data.google_email ? `google:${data.google_email}` : data.username, true);
  await setSessionCookie(created.id, created.session_version);
  (await cookies()).set(RECOVERY_COOKIE, code, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/admin', maxAge: 30 * 60,
  });
  return { ok: true as const };
}

/** Genera un código de recuperación nuevo (el anterior deja de servir). */
export async function regenerateRecovery(user: AdminUser) {
  const code = newRecoveryCode();
  await sql`update admin_users set recovery_hash = ${recoveryHash(code)} where id = ${user.id}`;
  return code;
}

/** Olvidé mi contraseña: usuario + código de recuperación → contraseña nueva. */
export async function recoverWithCode(usernameRaw: string, code: string, password: string) {
  await ensureAuthSchema();
  const ip = await clientIp();
  if (await tooManyFailures(ip)) return { ok: false as const, error: `Demasiados intentos fallidos. Esperá ${WINDOW_MIN} minutos e intentá de nuevo.` };
  const username = usernameRaw.trim().toLowerCase();
  const [u] = await sql<{ id: string; recovery_hash: string | null }[]>`
    select id, recovery_hash from admin_users where username = ${username} or lower(google_email) = ${username} limit 1`;
  const given = Buffer.from(recoveryHash(code));
  const stored = Buffer.from(u?.recovery_hash ?? sha256('x'));
  const ok = !!u?.recovery_hash && given.length === stored.length && timingSafeEqual(given, stored);
  await recordAttempt(`recuperar:${username}`, ok);
  if (!u || !ok) return { ok: false as const, error: 'El usuario o el código de recuperación no son correctos.' };
  const hash = await bcrypt.hash(password, 12);
  const next = newRecoveryCode();
  const [r] = await sql<{ session_version: number }[]>`
    update admin_users set password_hash = ${hash}, recovery_hash = ${recoveryHash(next)},
      session_version = session_version + 1, last_login_at = now()
    where id = ${u.id} returning session_version`;
  await setSessionCookie(u.id, r.session_version);
  return { ok: true as const, code: next };
}

/** Ingreso con Google: solo si ese mail está vinculado a un usuario del panel. */
export async function loginWithGoogle(email: string) {
  await ensureAuthSchema();
  const [u] = await sql<AdminUser[]>`select id, username, display_name, session_version, google_email, (password_hash is not null) as has_password from admin_users where lower(google_email) = ${email.toLowerCase()}`;
  await recordAttempt(`google:${email}`, !!u);
  if (!u) return false;
  await sql`update admin_users set last_login_at = now() where id = ${u.id}`;
  await setSessionCookie(u.id, u.session_version);
  return true;
}

export async function linkGoogle(user: AdminUser, email: string | null) {
  const [taken] = email ? await sql`select 1 from admin_users where lower(google_email) = ${email.toLowerCase()} and id <> ${user.id}` : [];
  if (taken) return false;
  await sql`update admin_users set google_email = ${email ? email.toLowerCase() : null} where id = ${user.id}`;
  return true;
}
