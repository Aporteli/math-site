import { isLocale, localePath, type Locale } from '@/i18n/config';
import type { UserRole } from '@/lib/auth/roles';

export const LOGIN_PATH = '/login';
export const SIGNUP_PATH = '/signup';
export const TEACHER_HOME = '/teacher/students';
export const STUDENT_HOME = '/student/assignments';
export const VISITOR_HOME = '/';
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

/**
 * Post-Login Destination
 * login-ის შემდეგ განსაზღვრავს საბოლოო URL-ს.
 * 1. იღებს role-სთვის ნაგულისხმევ home-ს.
 * 2. ამოწმებს callbackUrl-ს.
 * 3. ამოწმებს callback URL-ში მითითებულ locale-ს.
 * 4. ამოწმებს, აქვს თუ არა role-ს ამ path-ზე წვდომა.
 * 5. თუ ყველაფერი სწორია → აბრუნებს callback URL-ს.
 * 6. წინააღმდეგ შემთხვევაში → აბრუნებს role-ის home-ს.
 */
export function resolvePostLoginHref(role: UserRole, locale: Locale, callbackUrl?: string | null) {
  const home = localePath(locale, dashboardHomeForRole(role));
  const pathname = extractPathname(callbackUrl);
  if (!pathname) return home;
  const { locale: callbackLocale, path } = splitLocalePath(pathname);
  if (!canAccessPath(path, role)) return home;
  return localePath(callbackLocale ?? locale, path);
}

/**
 * Extract Pathname
 * callbackUrl-დან იღებს მხოლოდ pathname-ს.
 * მაგალითად:
 * /ka/teacher/students?tab=active
          ↓
 * /ka/teacher/students
 * ასევე შეუძლია სრული URL-ის დამუშავება:
 * https://example.com/ka/teacher   
          ↓
 * /ka/teacher
 */
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

/**
 * Split Locale From Path
 * URL-ის pathname-ს ყოფს ორ ნაწილად:
 * locale + path
 * მაგალითად:
 * /ka/teacher/students
       ↓
 * locale: "ka"
 * path: "/teacher/students"
 * თუ locale არ არსებობს:
 * /teacher/students
        ↓
 * locale: null
 * path: "/teacher/students"
 */
export function splitLocalePath(pathname: string): {
  locale: Locale | null;
  path: string;
} {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return {
      locale: null,
      path: '/',
    };
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

/**
 * Login Path Check
 * ამოწმებს, არის თუ არა მოცემული path login route.
 * /login        → true
 * /login/reset  → true
 * /signup       → false
 */
export function isLoginPath(path: string) {
  return path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`);
}

/**
 * Teacher Path Check
 * ამოწმებს, ეკუთვნის თუ არა path teacher workspace-ს.
 * /teacher        → true
 * /teacher/users  → true
 * /student/...    → false
 */
export function isTeacherPath(path: string) {
  return path === '/teacher' || path.startsWith('/teacher/');
}

/**
 * Student Path Check
 * ამოწმებს, ეკუთვნის თუ არა path student workspace-ს.
 * /student          → true
 * /student/tasks    → true
 * /teacher/...      → false
 */
export function isStudentPath(path: string) {
  return path === '/student' || path.startsWith('/student/');
}

/**
 * Role-Based Path Access
 * ამოწმებს, აქვს თუ არა კონკრეტულ role-ს
 * მოცემულ path-ზე შესვლის უფლება.
 * Teacher paths:
 *   TEACHER → allowed
 *   ADMIN   → allowed
 * Student paths:
 *   STUDENT → allowed
 *   ADMIN   → allowed
 * სხვა public paths:
 *   ყველა role → allowed
 */
export function canAccessPath(path: string, role: UserRole) {
  if (isTeacherPath(path)) {
    return role === 'TEACHER' || role === 'ADMIN';
  }
  if (isStudentPath(path)) {
    return role === 'STUDENT' || role === 'ADMIN';
  }
  return true;
}
