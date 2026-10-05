import type { NextRequest, NextResponse } from 'next/server';

const CHUNK_SIZE = 4096 - 163;
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/** Stops a role refresh from redirecting to the same denied page forever. */
export const ROLE_SYNC_COOKIE = 'pinf-role-sync';

export function useSecureAuthCookie(requestUrl: string) {
  return process.env.NODE_ENV === 'production' || requestUrl.startsWith('https://');
}

export function sessionCookieName(secure: boolean) {
  return `${secure ? '__Secure-' : ''}next-auth.session-token`;
}

function cookieOptions(secure: boolean, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure,
    maxAge,
  };
}

export function writeSessionCookie(response: NextResponse, request: NextRequest, encoded: string) {
  const secure = useSecureAuthCookie(request.url);
  const name = sessionCookieName(secure);
  const options = cookieOptions(secure, SESSION_MAX_AGE);

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name === name || cookie.name.startsWith(`${name}.`)) {
      response.cookies.set(cookie.name, '', cookieOptions(secure, 0));
    }
  }

  if (encoded.length <= CHUNK_SIZE) {
    response.cookies.set(name, encoded, options);
    return;
  }

  const count = Math.ceil(encoded.length / CHUNK_SIZE);
  for (let index = 0; index < count; index += 1) {
    const start = index * CHUNK_SIZE;
    response.cookies.set(name + '.' + index, encoded.slice(start, start + CHUNK_SIZE), options);
  }
}

export function writeRoleSyncMarker(response: NextResponse, request: NextRequest, pathname: string) {
  const secure = useSecureAuthCookie(request.url);
  response.cookies.set(ROLE_SYNC_COOKIE, pathname, cookieOptions(secure, 15));
}
