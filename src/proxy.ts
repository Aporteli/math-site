import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { defaultLocale, isLocale, localeCookie, locales } from '@/i18n/config';
import { authSecret } from '@/lib/auth/secret';
import {
  canAccessPath,
  dashboardHomeForRole,
  isLoginPath,
  isStudentPath,
  isTeacherPath,
  LOGIN_PATH,
  resolvePostLoginHref,
  splitLocalePath,
} from '@/lib/auth/paths';
import { isUserRole } from '@/lib/auth/roles';
import { ROLE_SYNC_COOKIE, useSecureAuthCookie } from '@/lib/auth/session-cookie';

function detectLocale(request: NextRequest) {
  const saved = request.cookies.get(localeCookie)?.value;
  if (saved && isLocale(saved)) return saved;

  const accepted = request.headers.get('accept-language') ?? '';
  for (const entry of accepted.split(',')) {
    const tag = entry.split(';')[0]?.trim().slice(0, 2).toLowerCase();
    if (tag && isLocale(tag)) return tag;
  }

  return defaultLocale;
}

function withLocalePrefix(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = `/${detectLocale(request)}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (!hasLocale) return withLocalePrefix(request);
  const { locale, path } = splitLocalePath(pathname);
  if (!locale) return NextResponse.next();
  const needsAuth = isTeacherPath(path) || isStudentPath(path) || isLoginPath(path);
  if (!needsAuth) return NextResponse.next();
  const token = await getToken({
    req: request,
    secret: authSecret,
    secureCookie: useSecureAuthCookie(request.url),
  });

  const role = isUserRole(token?.role) ? token.role : null;

  // თუ შესულია და ისევ ლოგინის გვერდზე მიდის
  if (isLoginPath(path)) {
    if (!role || role === 'VISITOR') return NextResponse.next();

    const destination = resolvePostLoginHref(role, locale, request.nextUrl.searchParams.get('callbackUrl'));
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // თუ დაცულ გვერდზე შედის და არ არის დალოგინებული
  if (!role) {
    const login = request.nextUrl.clone();
    login.pathname = `/${locale}${LOGIN_PATH}`;
    login.search = '';
    login.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  // ქუქში ჩაწერილი როლი შესვლის მომენტისია. როლის შეცვლის შემდეგ ჯერ ბაზას ვუსწორებთ სესიას.
  if (!canAccessPath(path, role)) {
    if (request.cookies.get(ROLE_SYNC_COOKIE)?.value === pathname) {
      const home = request.nextUrl.clone();
      if (role === 'VISITOR') {
        home.pathname = `/${locale}`;
      } else {
        home.pathname = `/${locale}${dashboardHomeForRole(role)}`;
      }
      home.search = '';
      return NextResponse.redirect(home);
    }

    const sync = request.nextUrl.clone();
    sync.pathname = '/api/auth/sync-role';
    sync.search = '';
    sync.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(sync);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

