import { NextResponse, type NextRequest } from 'next/server';
import { localeCookie } from '@/i18n/config';
import { useSecureAuthCookie } from '@/lib/auth/session-cookie';
import {
  MEET_CONNECT_TTL_MS,
  MEET_OAUTH_COOKIE,
  isSameOriginPost,
  meetOauthCookie,
  requestLocale,
  teacherMeetHome,
} from '@/lib/lesson-room/meet-connect';
import { actorRedirect, beginMeetConnect, currentMeetActor } from '@/lib/lesson-room/meet-connect-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const localeValue = form?.get('locale');
  const locale = requestLocale(
    typeof localeValue === 'string' ? localeValue : null,
    request.cookies.get(localeCookie)?.value,
  );
  const origin = request.nextUrl.origin;
  if (!isSameOriginPost(request.headers.get('origin'), origin)) {
    return NextResponse.redirect(teacherMeetHome(origin, locale, 'invalid'), 303);
  }

  const actor = await currentMeetActor();
  const denied = actorRedirect(origin, locale, actor);
  if (denied) return NextResponse.redirect(denied, 303);
  if (actor.kind !== 'ok') {
    return NextResponse.redirect(teacherMeetHome(origin, locale, 'invalid'), 303);
  }

  const begun = await beginMeetConnect({ userId: actor.userId, locale, origin });
  const response = NextResponse.redirect(begun.location, 303);
  if (begun.ok) {
    response.cookies.set(
      MEET_OAUTH_COOKIE,
      begun.state,
      meetOauthCookie(useSecureAuthCookie(request.url), MEET_CONNECT_TTL_MS / 1000),
    );
  }
  return response;
}
