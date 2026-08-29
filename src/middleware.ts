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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (!hasLocale) return withLocalePrefix(request);

  const { locale, path } = splitLocalePath(pathname);
  if (!locale) return NextResponse.next();

  const needsAuth = isTeacherPath(path) || isStudentPath(path) || isLoginPath(path);
  if (!needsAuth) return NextResponse.next();

  const isSecure = process.env.NODE_ENV === 'production' || request.url.startsWith('https://');
  const token = await getToken({
    req: request,
    secret: authSecret,
    secureCookie: isSecure,
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

  // თუ როლი არ ემთხვევა გვერდს (მაგ. STUDENT ცდილობს TEACHER-ის გვერდზე შესვლას)
  if (!canAccessPath(path, role)) {
    const home = request.nextUrl.clone();
    if (role === 'VISITOR') {
      home.pathname = `/${locale}`;
    } else {
      home.pathname = `/${locale}${dashboardHomeForRole(role)}`;
    }
    home.search = '';
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};