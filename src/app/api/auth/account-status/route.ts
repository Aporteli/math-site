import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { defaultLocale, isLocale, localeCookie, localePath } from '@/i18n/config';
import { dashboardHomeForRole, isStudentPath, isTeacherPath, splitLocalePath } from '@/lib/auth/paths';
import { findRequestUser } from '@/lib/auth/request-user';
import { isUserRole, type UserRole } from '@/lib/auth/roles';
import { authSecret } from '@/lib/auth/secret';
import { clearSessionCookie, useSecureAuthCookie } from '@/lib/auth/session-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function requestLocale(request: NextRequest) {
  const saved = request.cookies.get(localeCookie)?.value;
  if (saved && isLocale(saved)) return saved;
  return defaultLocale;
}

function safeNext(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('next');
  if (!value || value.length > 2000) return null;

  let url: URL;
  try {
    url = new URL(value, request.url);
  } catch {
    return null;
  }

  if (url.origin !== request.nextUrl.origin) return null;
  if (!url.pathname.startsWith('/') || url.pathname.startsWith('//')) return null;
  const { path } = splitLocalePath(url.pathname);
  if (isStudentPath(path) || isTeacherPath(path) || path.startsWith('/api/')) return null;
  return url;
}

export async function GET(request: NextRequest) {
  const locale = requestLocale(request);
  const home = new URL(localePath(locale, '/'), request.url);
  const next = safeNext(request) ?? (request.nextUrl.searchParams.has('next') ? home : null);

  if (!authSecret) {
    return next ? NextResponse.redirect(home) : NextResponse.json({ active: true });
  }

  const token = await getToken({
    req: request,
    secret: authSecret,
    secureCookie: useSecureAuthCookie(request.url),
  });
  const userId = typeof token?.id === 'string' ? token.id : '';
  const email = typeof token?.email === 'string' ? token.email : '';
  const jwtRole: UserRole = isUserRole(token?.role) ? token.role : 'VISITOR';

  if (!token || (!userId && !email)) {
    const response = next ? NextResponse.redirect(next) : NextResponse.json({ active: false });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  try {
    const dbUser = await findRequestUser(userId, email);
    if (!dbUser) {
      const response = next ? NextResponse.redirect(next) : NextResponse.json({ active: false });
      clearSessionCookie(response, request);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    if (next) {
      const role: UserRole = isUserRole(dbUser.role) ? dbUser.role : jwtRole;
      return NextResponse.redirect(new URL(localePath(locale, dashboardHomeForRole(role)), request.url));
    }

    return NextResponse.json({ active: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('ACCOUNT_STATUS_ERROR:', error);
    return NextResponse.json({ active: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
