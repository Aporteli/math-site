import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { defaultLocale, isLocale, localePath, type Locale } from '@/i18n/config';
import { LOGIN_PATH, TEACHER_HOME, dashboardHomeForRole } from '@/lib/auth/paths';
import type { UserRole } from '@/lib/auth/roles';

export const MEET_SCOPE = 'https://www.googleapis.com/auth/meetings.space.created';
export const MEET_OAUTH_COOKIE = 'pinf-meet-oauth';
export const MEET_CONNECT_TTL_MS = 10 * 60 * 1000;

const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const NOTICES = [
  'connected',
  'kept',
  'denied',
  'missing_refresh',
  'invalid',
  'disconnected',
  'unconfigured',
  'unavailable',
] as const;

export type MeetConnectNotice = (typeof NOTICES)[number];

export function meetConnectConfigured(): boolean {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ?? '';
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      /^[0-9a-f]{64}$/i.test(key),
  );
}

export function parseMeetNotice(value: string | string[] | undefined): MeetConnectNotice | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !(NOTICES as readonly string[]).includes(raw)) return null;
  return raw as MeetConnectNotice;
}

export function requestLocale(formLocale: string | null, cookieLocale: string | undefined): Locale {
  if (formLocale && isLocale(formLocale)) return formLocale;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;
  return defaultLocale;
}

export function isSameOriginPost(originHeader: string | null, requestOrigin: string): boolean {
  return Boolean(originHeader) && originHeader === requestOrigin;
}

export function meetConnectRedirectUri(origin: string): string {
  return new URL('/api/google/meet/callback', origin).toString();
}

export function meetOauthCookie(secure: boolean, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/api/google/meet',
    maxAge,
  };
}

export function buildMeetAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', MEET_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', input.state);
  return url.toString();
}

export function createMeetState(): string {
  return randomBytes(32).toString('base64url');
}

export function isMeetState(value: string | null | undefined): value is string {
  return typeof value === 'string' && STATE_PATTERN.test(value);
}

export function hashMeetState(state: string): string {
  return createHash('sha256').update(state).digest('hex');
}

export function statesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!isMeetState(left) || !isMeetState(right)) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function hasMeetScope(scope: string | undefined): boolean {
  if (!scope || scope.length > 500) return false;
  return scope.split(/\s+/).filter(Boolean).includes(MEET_SCOPE);
}

export function classifyTokenInfo(
  payload: unknown,
  clientId: string,
):
  | { status: 'mismatch' }
  | { status: 'unconfirmed' }
  | { status: 'confirmed'; email: string | null; subject: string | null } {
  if (!payload || typeof payload !== 'object') return { status: 'unconfirmed' };
  const record = payload as Record<string, unknown>;
  const audience = [record.aud, record.audience, record.azp, record.issued_to].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  if (audience.length === 0) return { status: 'unconfirmed' };
  if (!audience.includes(clientId)) return { status: 'mismatch' };
  return {
    status: 'confirmed',
    email: verifiedEmail(record),
    subject: googleSubject(record),
  };
}

function verifiedEmail(record: Record<string, unknown>): string | null {
  if (record.email_verified !== true && record.email_verified !== 'true') return null;
  if (typeof record.email !== 'string') return null;
  const email = record.email.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function googleSubject(record: Record<string, unknown>): string | null {
  const raw = record.sub ?? record.user_id;
  if (typeof raw !== 'string' || !/^[A-Za-z0-9._-]{1,255}$/.test(raw)) return null;
  return raw;
}

export function teacherMeetHome(origin: string, locale: Locale, notice?: MeetConnectNotice): string {
  const url = new URL(localePath(locale, TEACHER_HOME), origin);
  if (notice) url.searchParams.set('meet', notice);
  return url.toString();
}

export function loginLocation(origin: string, locale: Locale): string {
  return new URL(localePath(locale, LOGIN_PATH), origin).toString();
}

export function roleHome(origin: string, locale: Locale, role: UserRole): string {
  return new URL(localePath(locale, dashboardHomeForRole(role)), origin).toString();
}
