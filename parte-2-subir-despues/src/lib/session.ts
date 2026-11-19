// Firma y verificación del token de sesión (sin acceso a base de datos,
// para poder usarse también en proxy.ts).
import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'nexo_session';
export const SESSION_DAYS = 7;

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET falta o es demasiado corta (mínimo 32 caracteres).');
  return new TextEncoder().encode(s);
}

export type SessionPayload = { sub: string; v: number };

export async function signSession(p: SessionPayload) {
  return new SignJWT({ v: p.v })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.v !== 'number') return null;
    return { sub: payload.sub, v: payload.v };
  } catch {
    return null;
  }
}
