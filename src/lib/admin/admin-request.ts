import { NextResponse } from 'next/server';
import { isLocale } from '@/i18n/config';
import { requireRole } from '@/lib/auth/session';

export async function requireAdminActor(request: Request) {
  const locale = new URL(request.url).searchParams.get('locale');
  if (!locale || !isLocale(locale)) {
    return {
      response: NextResponse.json({ error: 'Invalid locale' }, { status: 400 }),
    };
  }

  const session = await requireRole(locale, ['ADMIN']);
  return { actor: session.user.email ?? 'unknown' };
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}
