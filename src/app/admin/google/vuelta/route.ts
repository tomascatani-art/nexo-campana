import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { activateOwner, getCurrentAdmin, linkGoogle, loginWithGoogle } from '@/lib/auth';
import { callbackPath, exchangeCode, getGoogleConfig, requestOrigin } from '@/lib/google';

export const dynamic = 'force-dynamic';
const GOOGLE_COOKIE = 'nexo_google';

// Google vuelve acá después de que la persona elige su cuenta.
export async function GET(req: NextRequest) {
  const origin = await requestOrigin();
  const go = (path: string, error?: string) => {
    const u = new URL(path, origin);
    if (error) u.searchParams.set('error', error);
    const res = NextResponse.redirect(u);
    res.cookies.delete({ name: GOOGLE_COOKIE, path: '/admin/google' });
    return res;
  };

  let st: { state: string; verifier: string; modo: string; invite: string };
  try {
    const { payload } = await jwtVerify(req.cookies.get(GOOGLE_COOKIE)?.value || '', new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ['HS256'] });
    st = payload as typeof st;
  } catch {
    return go('/admin/login', 'El ingreso con Google tardó demasiado o se abrió en otro navegador. Probá de nuevo.');
  }
  const errorPath = st.modo === 'activar' ? `/admin/activar?c=${encodeURIComponent(st.invite)}` : st.modo === 'vincular' ? '/admin/cuenta' : '/admin/login';
  const sp = req.nextUrl.searchParams;
  if (sp.get('error')) return go(errorPath, 'Se canceló el ingreso con Google.');
  if (!sp.get('code') || sp.get('state') !== st.state) return go(errorPath, 'Respuesta de Google inválida. Probá de nuevo.');

  const cfg = await getGoogleConfig();
  if (!cfg) return go('/admin/login', 'El ingreso con Google no está configurado.');
  let profile;
  try {
    profile = await exchangeCode(cfg, sp.get('code')!, origin + callbackPath, st.verifier);
  } catch (e) {
    return go(errorPath, (e as Error).message);
  }

  if (st.modo === 'activar') {
    const r = await activateOwner(st.invite, { username: profile.email, display_name: profile.name, google_email: profile.email });
    if (!r.ok) return go(errorPath, r.error);
    return go('/admin/cuenta?bienvenida=1');
  }
  if (st.modo === 'vincular') {
    const user = await getCurrentAdmin();
    if (!user) return go('/admin/login');
    if (!(await linkGoogle(user, profile.email))) return go('/admin/cuenta', 'Esa cuenta de Google ya está vinculada a otro usuario.');
    const u = new URL('/admin/cuenta', origin);
    u.searchParams.set('ok', `Listo: ya podés entrar con ${profile.email}.`);
    const res = NextResponse.redirect(u);
    res.cookies.delete({ name: GOOGLE_COOKIE, path: '/admin/google' });
    return res;
  }
  if (!(await loginWithGoogle(profile.email))) return go('/admin/login', `La cuenta ${profile.email} no tiene acceso a este panel.`);
  return go('/admin');
}
