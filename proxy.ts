import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/session';

// Primera barrera: sin una sesión firmada válida no se puede entrar al panel.
// (Cada página y acción del panel vuelve a verificar contra la base de datos.)
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Páginas abiertas: ingresar, activar la cuenta del dueño, recuperar acceso y la vuelta de Google
  if (pathname === '/admin/login' || pathname === '/admin/activar' || pathname === '/admin/recuperar' || pathname.startsWith('/admin/google/')) {
    return NextResponse.next();
  }
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
