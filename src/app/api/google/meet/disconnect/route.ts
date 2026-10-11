import { NextResponse, type NextRequest } from 'next/server';
import { localeCookie } from '@/i18n/config';
import {
  isSameOriginPost,
  requestLocale,
  teacherMeetHome,
} from '@/lib/lesson-room/meet-connect';
import { actorRedirect, currentMeetActor, disconnectMeet } from '@/lib/lesson-room/meet-connect-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const locale = requestLocale(
    typeof form?.get('locale') === 'string' ? String(form.get('locale')) : null,
    request.cookies.get(localeCookie)?.value,
  );
  const origin = request.nextUrl.origin;
  if (!isSameOriginPost(request.headers.get('origin'), origin)) {
    return NextResponse.redirect(teacherMeetHome(origin, locale, 'invalid'), 303);
  }

  const actor = await currentMeetActor();
  const denied = actorRedirect(origin, locale, actor);
  if (denied || actor.kind !== 'ok') {
    return NextResponse.redirect(denied ?? teacherMeetHome(origin, locale, 'invalid'), 303);
  }

  const notice = await disconnectMeet(actor.userId);
  return NextResponse.redirect(teacherMeetHome(origin, locale, notice), 303);
}
