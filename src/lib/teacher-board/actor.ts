import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { authSecret } from '@/lib/auth/secret';
import { isUserRole } from '@/lib/auth/roles';

/** Decode the session cookie. Does not hit the database. */
export async function teacherBoardUserId(req: Request) {
  const secureCookie = process.env.NODE_ENV === 'production' || req.url.startsWith('https://');
  const token = await getToken({
    req: req as NextRequest,
    secret: authSecret,
    secureCookie,
  });
  const userId = typeof token?.id === 'string' ? token.id : '';
  if (!userId || !isUserRole(token?.role)) return null;
  if (token.role !== 'TEACHER' && token.role !== 'ADMIN') return null;
  return userId;
}
