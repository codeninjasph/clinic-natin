import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read role from cookie or auth token
  const roleCookie = request.cookies.get('clinic_natin_role')?.value;
  const hasAuthSession = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  ) || !!request.cookies.get('sb-kwxvevuzhrrlebefvtrr-auth-token');

  // Helper to determine effective role
  const role = roleCookie;

  // 0. Auto-redirect /admin to /cnadmin
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const subpath = pathname.replace(/^\/admin/, '') || '';
    return NextResponse.redirect(new URL(`/cnadmin${subpath}`, request.url));
  }

  // 1. Intercept /dashboard (Smart Gateway)
  if (pathname === '/dashboard') {
    if (!role && !hasAuthSession) {
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
    if (!role && !hasAuthSession) {
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
    if (!role && !hasAuthSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('unauthorized', '1');
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role === 'PATIENT') {
      return NextResponse.redirect(new URL('/my-queue', request.url));
    }
  }

  // 4. Protect /cnadmin/* routes (Strict Admin Isolation)
  if (pathname === '/cnadmin' || pathname.startsWith('/cnadmin/')) {
    if (!role && !hasAuthSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('unauthorized', '1');
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based isolation: redirect staff/patients to their own suites
    if (role === 'DOCTOR') {
      const doctorUrl = new URL('/doctor/dashboard', request.url);
      doctorUrl.searchParams.set('unauthorized', '1');
      return NextResponse.redirect(doctorUrl);
    }

    if (role === 'SECRETARY') {
      const secUrl = new URL('/secretary/dashboard', request.url);
      secUrl.searchParams.set('unauthorized', '1');
      return NextResponse.redirect(secUrl);
    }

    if (role === 'PATIENT') {
      const patientUrl = new URL('/my-queue', request.url);
      patientUrl.searchParams.set('unauthorized', '1');
      return NextResponse.redirect(patientUrl);
    }

    if (role && role !== 'ADMIN') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('unauthorized', '1');
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. Protect /api/admin/* endpoints
  if (pathname.startsWith('/api/admin')) {
    if (!role && !hasAuthSession) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 401 }
      );
    }

    if (role && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient privileges for admin operations' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/cnadmin',
    '/cnadmin/:path*',
    '/api/admin/:path*',
    '/dashboard',
    '/secretary/:path*',
    '/doctor/:path*',
  ],
};

export { proxy };
