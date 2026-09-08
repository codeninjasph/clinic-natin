import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read role from cookie or auth token
  const roleCookie = request.cookies.get('clinic_natin_role')?.value;
  const authSessionCookie = request.cookies.get('sb-kwxvevuzhrrlebefvtrr-auth-token')?.value;

  // Helper to determine effective role
  let role = roleCookie;

  // 0. Auto-redirect /admin to /cnadmin
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const subpath = pathname.replace(/^\/admin/, '') || '';
    return NextResponse.redirect(new URL(`/cnadmin${subpath}`, request.url));
  }

  // 1. Intercept /dashboard (Smart Gateway)
  if (pathname === '/dashboard') {
    if (!role && !authSessionCookie) {
      // Unauthenticated -> redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', '/dashboard');
      return NextResponse.redirect(loginUrl);
    }

    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/cnadmin', request.url));
    }

    if (role === 'SECRETARY') {
      return NextResponse.redirect(new URL('/secretary/dashboard', request.url));
    }

    if (role === 'DOCTOR') {
      return NextResponse.redirect(new URL('/doctor/dashboard', request.url));
    }

    // Default authenticated or patient
    return NextResponse.redirect(new URL('/my-queue', request.url));
  }

  // 2. Protect /secretary/* routes
  if (pathname.startsWith('/secretary')) {
    if (!role && !authSessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('unauthorized', '1');
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role === 'PATIENT') {
      return NextResponse.redirect(new URL('/my-queue', request.url));
    }
  }

  // 3. Protect /doctor/* routes
  if (pathname.startsWith('/doctor')) {
    if (!role && !authSessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('unauthorized', '1');
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role === 'PATIENT') {
      return NextResponse.redirect(new URL('/my-queue', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/dashboard',
    '/secretary/:path*',
    '/doctor/:path*',
  ],
};

export { proxy };
