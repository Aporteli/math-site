import { parseMeetUrl, parseMiroBoardId } from '@/lib/lesson-room/links';

const MEET_SCOPE = 'https://www.googleapis.com/auth/meetings.space.created';

export function meetApiConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_MEET_REFRESH_TOKEN &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function miroApiConfigured(): boolean {
  return Boolean(process.env.MIRO_ACCESS_TOKEN);
}

function publicError(status: number, body: string): string {
  const clean = body.replace(/bearer\s+\S+/gi, 'bearer [redacted]').replace(/\s+/g, ' ').slice(0, 240);
  return `HTTP ${status}: ${clean || 'request failed'}`;
}

async function readError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof parsed.message === 'string') return publicError(response.status, parsed.message);
    if (typeof parsed.error === 'string') return publicError(response.status, parsed.error);
    if (parsed.error && typeof parsed.error.message === 'string') {
      return publicError(response.status, parsed.error.message);
    }
  } catch {
    /* The provider returned a non-JSON body. */
  }
  return publicError(response.status, body);
}

async function meetAccessToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const refreshToken = process.env.GOOGLE_MEET_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) {
    return { ok: false, error: 'Google Meet API is not configured.' };
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  if (!response.ok) return { ok: false, error: await readError(response) };

  const payload = (await response.json()) as { access_token?: string; scope?: string };
  if (!payload.access_token) return { ok: false, error: 'Google did not return an access token.' };
  if (payload.scope && !payload.scope.split(' ').includes(MEET_SCOPE)) {
    return { ok: false, error: 'The Google token is missing the Meet space scope.' };
  }
  return { ok: true, token: payload.access_token };
}

export async function createMeetSpace(): Promise<
  { ok: true; meetUrl: string; meetSpaceName: string } | { ok: false; error: string }
> {
  const access = await meetAccessToken();
  if (!access.ok) return access;

  const response = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access.token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) return { ok: false, error: await readError(response) };

  const space = (await response.json()) as { name?: string; meetingUri?: string };
  const meetUrl = typeof space.meetingUri === 'string' ? parseMeetUrl(space.meetingUri) : null;
  if (!meetUrl || typeof space.name !== 'string' || !space.name.startsWith('spaces/')) {
    return { ok: false, error: 'Google Meet returned an unexpected meeting link.' };
  }
  return { ok: true, meetUrl, meetSpaceName: space.name };
}

export async function createMiroBoard(
  name: string,
): Promise<{ ok: true; miroBoardId: string } | { ok: false; error: string }> {
  const token = process.env.MIRO_ACCESS_TOKEN;
  if (!token) return { ok: false, error: 'Miro API is not configured.' };

  const response = await fetch('https://api.miro.com/v2/boards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: name.slice(0, 60) || 'Lesson',
      policy: { sharingPolicy: { access: 'edit' } },
    }),
    cache: 'no-store',
  });
  if (!response.ok) return { ok: false, error: await readError(response) };

  const board = (await response.json()) as { id?: string };
  const miroBoardId = typeof board.id === 'string' ? parseMiroBoardId(board.id) : null;
  if (!miroBoardId) return { ok: false, error: 'Miro returned an unexpected board id.' };
  return { ok: true, miroBoardId };
}
