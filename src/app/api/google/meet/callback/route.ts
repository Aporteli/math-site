import { NextResponse, type NextRequest } from 'next/server';
import { localeCookie } from '@/i18n/config';
import { useSecureAuthCookie } from '@/lib/auth/session-cookie';
import { MEET_OAUTH_COOKIE, meetOauthCookie, requestLocale, statesMatch } from '@/lib/lesson-room/meet-connect';
import { finishMeetConnect } from '@/lib/lesson-room/meet-connect-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const locale = requestLocale(null, request.cookies.get(localeCookie)?.value);
  const googleError = request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get(MEET_OAUTH_COOKIE)?.value ?? null;
  const location = await finishMeetConnect({
    origin: request.nextUrl.origin,
    localeFallback: locale,
    code: request.nextUrl.searchParams.get('code'),
    state,
    cookieState,
    googleError: googleError && googleError.length <= 64 ? googleError : googleError ? 'rejected' : null,
  });
  const response = NextResponse.redirect(location);
  if (statesMatch(state, cookieState)) {
    response.cookies.set(MEET_OAUTH_COOKIE, '', meetOauthCookie(useSecureAuthCookie(request.url), 0));
  }
  return response;
}
