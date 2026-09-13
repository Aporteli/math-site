import { isLocale, localePath, type Locale } from '@/i18n/config';
import type { UserRole } from '@/lib/auth/roles';

export const LOGIN_PATH = '/login';
export const SIGNUP_PATH = '/signup';
export const TEACHER_HOME = '/teacher/students';
export const STUDENT_HOME = '/student/assignments';
export const VISITOR_HOME = '/';

/**
 * Lets the site owner preview both protected workspaces during local
 * development. It is never enabled in a production build.
 */
export function isLocalDashboardPreview() {
  return process.env.NODE_ENV === 'development';
}

export function dashboardHomeForRole(role: UserRole) {
  switch (role) {
    case 'ADMIN':
    case 'TEACHER':
      return TEACHER_HOME;
    case 'STUDENT':
      return STUDENT_HOME;
    case 'VISITOR':
    default:
      return VISITOR_HOME;
  }
}

export function splitLocalePath(pathname: string): {
  locale: Locale | null;
  path: string;
} {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { locale: null, path: '/' };
  }

  if (isLocale(segments[0])) {
    const rest = segments.slice(1);
    return {
      locale: segments[0],
      path: rest.length === 0 ? '/' : `/${rest.join('/')}`,
    };
  }

  return {
    locale: null,
    path: pathname.startsWith('/') ? pathname : `/${pathname}`,
  };
}

export function isLoginPath(path: string) {
  return path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`);
}

export function isTeacherPath(path: string) {
  return path === '/teacher' || path.startsWith('/teacher/');
}

export function isStudentPath(path: string) {
  return path === '/student' || path.startsWith('/student/');
}

export function canAccessPath(path: string, role: UserRole) {
  if (isTeacherPath(path)) return role === 'TEACHER' || role === 'ADMIN';
  if (isStudentPath(path)) return role === 'STUDENT' || role === 'ADMIN';
  // ვიზიტორს და ნებისმიერ სხვა როლს აქვს წვდომა ყველა დანარჩენ საჯარო გვერდზე
  return true;
}

/**
 * After a successful sign-in, send the user to `callbackUrl` when it belongs
 * to their role; otherwise fall back to the role home.
 */
export function resolvePostLoginHref(role: UserRole, locale: Locale, callbackUrl?: string | null) {
  const home = localePath(locale, dashboardHomeForRole(role));
  const pathname = extractPathname(callbackUrl);

  if (!pathname) return home;

  const { locale: callbackLocale, path } = splitLocalePath(pathname);
  if (!canAccessPath(path, role)) return home;

  return localePath(callbackLocale ?? locale, path);
}

function extractPathname(value?: string | null) {
  if (!value) return null;

  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      const url = new URL(value);
      return url.pathname;
    }
  } catch {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value.split('?')[0] ?? null;
}
