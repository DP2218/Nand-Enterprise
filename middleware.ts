// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

// Paths only admins can access
const ADMIN_PATHS = ['/admin', '/employees', '/attendance', '/leave', '/salary', '/advances', '/reports'];
// Paths only employees can access
const EMPLOYEE_PATHS = ['/employee', '/my-attendance', '/my-leave', '/my-salary', '/my-advances'];

function matchesPath(pathname: string, targetPath: string): boolean {
  return pathname === targetPath || pathname.startsWith(targetPath + '/');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets (images, icons, styles, scripts)
  if (
    PUBLIC_PATHS.some((p) => matchesPath(pathname, p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(png|svg|jpg|jpeg|gif|webp|ico|css|js)$/i.test(pathname) ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Get session
  const session = await getSessionFromRequest(request);

  // No session → redirect to login
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect API routes (all except /api/auth/login)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login')) {
    // Session is present, allow — roles are checked inside each route handler
    return NextResponse.next();
  }

  // Must change password: only allow /change-password
  if (session.mustChangePw && !matchesPath(pathname, '/change-password')) {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }

  // Role-based route protection with exact path boundary matching
  const isAdminPath = ADMIN_PATHS.some((p) => matchesPath(pathname, p));
  const isEmployeePath = EMPLOYEE_PATHS.some((p) => matchesPath(pathname, p));

  if (isAdminPath && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/employee', request.url));
  }

  if (isEmployeePath && session.role !== 'employee') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export default middleware;
