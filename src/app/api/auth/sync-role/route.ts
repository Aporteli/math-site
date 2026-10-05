import { NextResponse, type NextRequest } from 'next/server';
import { encode, getToken } from 'next-auth/jwt';
import { defaultLocale, isLocale, localeCookie, localePath } from '@/i18n/config';
import { findRequestUser } from '@/lib/auth/request-user';
import { authSecret } from '@/lib/auth/secret';
import { isUserRole, type UserRole } from '@/lib/auth/roles';
import {
  canAccessPath,
  dashboardHomeForRole,
  isStudentPath,
  isTeacherPath,
  LOGIN_PATH,
  splitLocalePath,
} from '@/lib/auth/paths';
import { clearSessionCookie, useSecureAuthCookie, writeRoleSyncMarker, writeSessionCookie } from '@/lib/auth/session-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function requestLocale(request: NextRequest, callback: URL | null) {
  const fromCallback = callback ? splitLocalePath(callback.pathname).locale : null;
  if (fromCallback) return fromCallback;
  const saved = request.cookies.get(localeCookie)?.value;
  if (saved && isLocale(saved)) return saved;
  return defaultLocale;
}

function safeCallback(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('callbackUrl');
  if (!value || value.length > 2000) return null;

  let url: URL;
  try {
    url = new URL(value, request.url);
  } catch {
    return null;
  }

  if (url.origin !== request.nextUrl.origin) return null;
  if (!url.pathname.startsWith('/') || url.pathname.startsWith('//')) return null;
  if (url.pathname === '/api/auth/sync-role' || url.pathname.startsWith('/api/auth/sync-role/')) return null;
  return url;
}

export async function GET(request: NextRequest) {
  const callback = safeCallback(request);
  const locale = requestLocale(request, callback);
  const home = new URL(localePath(locale, '/'), request.url);

  if (!authSecret) return NextResponse.redirect(home);

  const secureCookie = useSecureAuthCookie(request.url);
  const token = await getToken({ req: request, secret: authSecret, secureCookie });
  const userId = typeof token?.id === 'string' ? token.id : '';
  const email = typeof token?.email === 'string' ? token.email : '';
  const jwtRole: UserRole = isUserRole(token?.role) ? token.role : 'VISITOR';

  if (!token || (!userId && !email)) {
    const login = new URL(localePath(locale, LOGIN_PATH), request.url);
    if (callback) login.searchParams.set('callbackUrl', `${callback.pathname}${callback.search}`);
    return NextResponse.redirect(login);
  }

  try {
    const dbUser = await findRequestUser(userId, email);
    if (!dbUser) {
      const response = NextResponse.redirect(home);
      clearSessionCookie(response, request);
      return response;
    }
    const liveRole: UserRole = isUserRole(dbUser.role) ? dbUser.role : jwtRole;
    const callbackPath = callback ? splitLocalePath(callback.pathname).path : null;
    const destination =
      callback && callbackPath && canAccessPath(callbackPath, liveRole)
        ? callback
        : new URL(localePath(locale, dashboardHomeForRole(liveRole)), request.url);

    const response = NextResponse.redirect(destination);
    if (dbUser && liveRole !== jwtRole) {
      const encoded = await encode({
        secret: authSecret,
        token: {
          ...token,
          id: dbUser.id,
          sub: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: liveRole,
        },
      });
      writeSessionCookie(response, request, encoded);
    }

    const destinationPath = splitLocalePath(destination.pathname).path;
    if (isStudentPath(destinationPath) || isTeacherPath(destinationPath)) {
      writeRoleSyncMarker(response, request, destination.pathname);
    }

    return response;
  } catch (error) {
    console.error('SYNC_ROLE_ERROR:', error);
    return NextResponse.redirect(home);
  }
}
