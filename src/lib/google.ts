import 'server-only';
import { headers } from 'next/headers';
import { sql } from './db';
import { ensureAuthSchema } from './auth-schema';

// Ingreso con Google (OAuth 2.0 / OpenID Connect, con PKCE), sin librerías extra.
// Los datos del "cliente de Google" se cargan desde el panel (Mi cuenta) o, si se
// prefiere, como variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el hosting.

export type GoogleConfig = { clientId: string; clientSecret: string; source: 'panel' | 'hosting' };

export async function getGoogleConfig(): Promise<GoogleConfig | null> {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, source: 'hosting' };
  }
  try {
    await ensureAuthSchema();
    const [r] = await sql<{ google_client_id: string | null; google_client_secret: string | null }[]>`
      select google_client_id, google_client_secret from auth_config where id = 1`;
    if (r?.google_client_id && r.google_client_secret) return { clientId: r.google_client_id, clientSecret: r.google_client_secret, source: 'panel' };
  } catch (e) {
    console.error(e);
  }
  return null;
}

export async function saveGoogleConfig(clientId: string | null, clientSecret: string | null) {
  await ensureAuthSchema();
  await sql`insert into auth_config (id, google_client_id, google_client_secret, updated_at) values (1, ${clientId}, ${clientSecret}, now())
            on conflict (id) do update set google_client_id = excluded.google_client_id,
              google_client_secret = excluded.google_client_secret, updated_at = now()`;
}

/** Dirección de esta web tal como la abrió la persona (para volver de Google al mismo lugar). */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  return `${proto.split(',')[0]}://${host.split(',')[0]}`;
}

export const callbackPath = '/admin/google/vuelta';

export function authUrl(cfg: GoogleConfig, redirectUri: string, state: string, challenge: string) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return u.toString();
}

export type GoogleProfile = { email: string; name: string | null };

/** Cambia el código que devuelve Google por los datos verificados de la cuenta. */
export async function exchangeCode(cfg: GoogleConfig, code: string, redirectUri: string, verifier: string): Promise<GoogleProfile> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirectUri,
      grant_type: 'authorization_code', code_verifier: verifier,
    }),
    cache: 'no-store',
  });
  const j = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string; error_description?: string };
  if (!res.ok || !j.id_token) throw new Error(`Google no aceptó el ingreso (${j.error || res.status}${j.error_description ? ': ' + j.error_description : ''}).`);
  // El id_token llega directo de Google por HTTPS, así que alcanza con revisar sus datos.
  const payload = JSON.parse(Buffer.from(j.id_token.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
    iss?: string; aud?: string; exp?: number; email?: string; email_verified?: boolean | string; name?: string;
  };
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') throw new Error('Respuesta de Google inválida.');
  if (payload.aud !== cfg.clientId) throw new Error('Respuesta de Google inválida.');
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('El ingreso con Google venció. Probá de nuevo.');
  if (!payload.email || !(payload.email_verified === true || payload.email_verified === 'true')) throw new Error('Esa cuenta de Google no tiene el mail verificado.');
  return { email: payload.email.toLowerCase(), name: payload.name ?? null };
}
