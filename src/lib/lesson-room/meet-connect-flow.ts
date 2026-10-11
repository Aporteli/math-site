import 'server-only';
import type { Locale } from '@/i18n/config';
import { isLocale } from '@/i18n/config';
import { findRequestUser } from '@/lib/auth/request-user';
import { getSession } from '@/lib/auth/session';
import { isUserRole, type UserRole } from '@/lib/auth/roles';
import { encryptMeetRefreshToken } from '@/lib/lesson-room/meet-token-crypto';
import { prisma } from '@/lib/prisma';
import {
  MEET_CONNECT_TTL_MS,
  MEET_SCOPE,
  buildMeetAuthorizeUrl,
  classifyTokenInfo,
  createMeetState,
  hasMeetScope,
  hashMeetState,
  isMeetState,
  loginLocation,
  meetConnectConfigured,
  meetConnectRedirectUri,
  roleHome,
  statesMatch,
  teacherMeetHome,
  type MeetConnectNotice,
} from '@/lib/lesson-room/meet-connect';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const MAX_CODE_LENGTH = 2048;
const MAX_REFRESH_TOKEN_LENGTH = 2048;

export type MeetConnectionView =
  | { status: 'connected'; googleEmail: string | null }
  | { status: 'disconnected' }
  | { status: 'unavailable' };

type Actor =
  | { kind: 'guest' }
  | { kind: 'forbidden'; role: UserRole }
  | { kind: 'ok'; userId: string };

type ConsumedState = { userId: string; locale: string; expiresAt: Date };

export async function currentMeetActor(): Promise<Actor> {
  try {
    const session = await getSession();
    const email = session?.user?.email?.trim().toLowerCase() ?? '';
    const id = session?.user?.id?.trim() ?? '';
    if (!email && !id) return { kind: 'guest' };
    const dbUser = await findRequestUser(id, email);
    if (!dbUser || !isUserRole(dbUser.role)) return { kind: 'guest' };
    if (dbUser.role !== 'TEACHER' && dbUser.role !== 'ADMIN') {
      return { kind: 'forbidden', role: dbUser.role };
    }
    return { kind: 'ok', userId: dbUser.id };
  } catch (error) {
    console.error('MEET_CONNECT_ACTOR_FAILED', error instanceof Error ? error.name : 'Error');
    return { kind: 'guest' };
  }
}

export function actorRedirect(origin: string, locale: Locale, actor: Actor): string | null {
  if (actor.kind === 'guest') return loginLocation(origin, locale);
  if (actor.kind === 'forbidden') return roleHome(origin, locale, actor.role);
  return null;
}

export async function readMeetConnection(userId: string): Promise<MeetConnectionView> {
  try {
    const row = await prisma.teacherMeetCredential.findUnique({
      where: { userId },
      select: { googleEmail: true },
    });
    if (!row) return { status: 'disconnected' };
    return { status: 'connected', googleEmail: row.googleEmail };
  } catch (error) {
    console.error('MEET_CONNECT_STATUS_FAILED', error instanceof Error ? error.name : 'Error');
    return { status: 'unavailable' };
  }
}

export async function beginMeetConnect(input: {
  userId: string;
  locale: Locale;
  origin: string;
}): Promise<{ ok: true; location: string; state: string } | { ok: false; location: string }> {
  if (!meetConnectConfigured()) {
    return { ok: false, location: teacherMeetHome(input.origin, input.locale, 'unconfigured') };
  }
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const state = createMeetState();
  const stateHash = hashMeetState(state);
  const expiresAt = new Date(Date.now() + MEET_CONNECT_TTL_MS);
  try {
    await prisma.teacherMeetConnectState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await prisma.teacherMeetConnectState.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        stateHash,
        locale: input.locale,
        expiresAt,
      },
      update: {
        stateHash,
        locale: input.locale,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('MEET_CONNECT_STATE_FAILED', error instanceof Error ? error.name : 'Error');
    return { ok: false, location: teacherMeetHome(input.origin, input.locale, 'unavailable') };
  }

  return {
    ok: true,
    state,
    location: buildMeetAuthorizeUrl({
      clientId,
      redirectUri: meetConnectRedirectUri(input.origin),
      state,
    }),
  };
}

export async function finishMeetConnect(input: {
  origin: string;
  localeFallback: Locale;
  code: string | null;
  state: string | null;
  cookieState: string | null;
  googleError: string | null;
}): Promise<string> {
  const fallback = teacherMeetHome(input.origin, input.localeFallback, 'invalid');
  if (!statesMatch(input.state, input.cookieState) || !isMeetState(input.state)) return fallback;

  const row = await consumeMeetState(input.state);
  if (!row) return fallback;
  const locale = isLocale(row.locale) ? row.locale : input.localeFallback;
  const home = (notice: MeetConnectNotice) => teacherMeetHome(input.origin, locale, notice);

  if (input.googleError === 'access_denied') return home('denied');
  if (input.googleError || !input.code || input.code.length > MAX_CODE_LENGTH) return home('invalid');
  if (row.expiresAt.getTime() <= Date.now()) return home('invalid');

  const actor = await currentMeetActor();
  const denied = actorRedirect(input.origin, locale, actor);
  if (denied) return denied;
  if (actor.kind !== 'ok' || actor.userId !== row.userId) return home('invalid');
  if (!meetConnectConfigured()) return home('unconfigured');

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const redirectUri = meetConnectRedirectUri(input.origin);
  const token = await exchangeMeetCode({
    code: input.code,
    clientId,
    clientSecret,
    redirectUri,
  });
  if (!token.ok) return home('invalid');
  if (!hasMeetScope(token.scope)) return home('invalid');
  if (!token.refreshToken) {
    const existing = await credentialExists(actor.userId);
    if (existing === 'yes') return home('kept');
    if (existing === 'no') return home('missing_refresh');
    return home('unavailable');
  }

  const identity = await readGoogleIdentity(token.accessToken, clientId);
  if (identity.status === 'mismatch') return home('invalid');

  try {
    const refreshTokenEnc = encryptMeetRefreshToken(token.refreshToken);
    await prisma.teacherMeetCredential.upsert({
      where: { userId: actor.userId },
      create: {
        userId: actor.userId,
        refreshTokenEnc,
        scope: MEET_SCOPE,
        googleEmail: identity.email,
        googleSubject: identity.subject,
      },
      update: {
        refreshTokenEnc,
        scope: MEET_SCOPE,
        googleEmail: identity.email,
        googleSubject: identity.subject,
        connectedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('MEET_CONNECT_SAVE_FAILED', error instanceof Error ? error.name : 'Error');
    return home('unavailable');
  }
  return home('connected');
}

export async function disconnectMeet(userId: string): Promise<MeetConnectNotice> {
  try {
    await prisma.teacherMeetCredential.deleteMany({ where: { userId } });
    return 'disconnected';
  } catch (error) {
    console.error('MEET_CONNECT_DISCONNECT_FAILED', error instanceof Error ? error.name : 'Error');
    return 'unavailable';
  }
}

async function consumeMeetState(state: string): Promise<ConsumedState | null> {
  const stateHash = hashMeetState(state);
  try {
    const row = await prisma.teacherMeetConnectState.findUnique({
      where: { stateHash },
      select: { userId: true, locale: true, expiresAt: true },
    });
    if (!row) return null;
    const deleted = await prisma.teacherMeetConnectState.deleteMany({
      where: {
        userId: row.userId,
        stateHash,
        expiresAt: { gt: new Date() },
      },
    });
    if (deleted.count !== 1) {
      await prisma.teacherMeetConnectState.deleteMany({
        where: { userId: row.userId, stateHash },
      });
      return null;
    }
    return row;
  } catch (error) {
    console.error('MEET_CONNECT_CONSUME_FAILED', error instanceof Error ? error.name : 'Error');
    return null;
  }
}

async function credentialExists(userId: string): Promise<'yes' | 'no' | 'unavailable'> {
  try {
    const row = await prisma.teacherMeetCredential.findUnique({
      where: { userId },
      select: { userId: true },
    });
    return row ? 'yes' : 'no';
  } catch (error) {
    console.error('MEET_CONNECT_LOOKUP_FAILED', error instanceof Error ? error.name : 'Error');
    return 'unavailable';
  }
}

async function exchangeMeetCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ ok: true; refreshToken: string | null; accessToken: string | null; scope: string | undefined } | { ok: false }> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: input.code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) {
      await response.arrayBuffer().catch(() => undefined);
      console.error('MEET_OAUTH_TOKEN_EXCHANGE_FAILED', response.status);
      return { ok: false };
    }
    const payload = (await response.json()) as {
      access_token?: unknown;
      refresh_token?: unknown;
      scope?: unknown;
    };
    const refreshToken =
      typeof payload.refresh_token === 'string' && payload.refresh_token.length > 0
        ? payload.refresh_token
        : null;
    if (refreshToken && refreshToken.length > MAX_REFRESH_TOKEN_LENGTH) return { ok: false };
    const accessToken = typeof payload.access_token === 'string' ? payload.access_token : null;
    const scope = typeof payload.scope === 'string' ? payload.scope : undefined;
    return { ok: true, refreshToken, accessToken, scope };
  } catch (error) {
    console.error('MEET_OAUTH_TOKEN_EXCHANGE_FAILED', error instanceof Error ? error.name : 'Error');
    return { ok: false };
  }
}

async function readGoogleIdentity(
  accessToken: string | null,
  clientId: string,
): Promise<{ status: 'mismatch' } | { status: 'unconfirmed' | 'confirmed'; email: string | null; subject: string | null }> {
  if (!accessToken) return { status: 'unconfirmed', email: null, subject: null };
  try {
    const response = await fetch(TOKENINFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: accessToken }),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) {
      await response.arrayBuffer().catch(() => undefined);
      return { status: 'unconfirmed', email: null, subject: null };
    }
    const payload: unknown = await response.json();
    const classified = classifyTokenInfo(payload, clientId);
    if (classified.status === 'mismatch') return { status: 'mismatch' };
    if (classified.status === 'unconfirmed') return { status: 'unconfirmed', email: null, subject: null };
    return classified;
  } catch (error) {
    console.error('MEET_OAUTH_TOKENINFO_FAILED', error instanceof Error ? error.name : 'Error');
    return { status: 'unconfirmed', email: null, subject: null };
  }
}
