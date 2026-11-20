import { NextResponse, type NextRequest } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { getCurrentAdmin, inviteIsValid } from '@/lib/auth';
import { authUrl, callbackPath, getGoogleConfig, requestOrigin } from '@/lib/google';

export const dynamic = 'force-dynamic';
const GOOGLE_COOKIE = 'nexo_google';

const back = (origin: string, path: string, error: string) => {
  const u = new URL(path, origin);
  u.searchParams.set('error', error);
  return NextResponse.redirect(u);
};

// /admin/google/entrar?modo=ingresar | activar&c=<código> | vincular
export async function GET(req: NextRequest) {
  const origin = await requestOrigin();
  const modo = req.nextUrl.searchParams.get('modo') || 'ingresar';
  const invite = req.nextUrl.searchParams.get('c') || '';
  const cfg = await getGoogleConfig();
  if (!cfg) return back(origin, '/admin/login', 'El ingreso con Google todavía no está configurado.');
  if (modo === 'activar' && !(await inviteIsValid(invite))) return back(origin, `/admin/activar`, 'El link de activación ya se usó o venció. Pedí uno nuevo.');
  if (modo === 'vincular' && !(await getCurrentAdmin())) return NextResponse.redirect(new URL('/admin/login', origin));
  if (!['ingresar', 'activar', 'vincular'].includes(modo)) return back(origin, '/admin/login', 'Pedido inválido.');

  const state = randomBytes(16).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ state, verifier, modo, invite })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('15m').sign(secret);

  const res = NextResponse.redirect(authUrl(cfg, origin + callbackPath, state, challenge));
  res.cookies.set(GOOGLE_COOKIE, token, {
    httpOnly: true, secure: origin.startsWith('https'), sameSite: 'lax', path: '/admin/google', maxAge: 15 * 60,
  });
  return res;
}
