import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_CHARS = 2_000_000;

async function teacherId() {
  const session = await getSession();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || (role !== 'TEACHER' && role !== 'ADMIN')) return null;
  return userId;
}

function readStrokes(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  return value;
}

export async function GET() {
  const userId = await teacherId();
  if (!userId) return NextResponse.json({ board: null }, { status: 401 });

  const record = await prisma.teacherBoard.findUnique({
    where: { userId },
    select: { strokes: true },
  });

  const strokes = record ? readStrokes(record.strokes) : null;
  if (!strokes) return NextResponse.json({ board: null });

  return NextResponse.json({ board: { strokes } });
}

export async function POST(req: Request) {
  const userId = await teacherId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { strokes?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!Array.isArray(body.strokes)) return NextResponse.json({ ok: false }, { status: 400 });

  const stored = JSON.stringify(body.strokes);
  if (stored.length > MAX_BODY_CHARS) return NextResponse.json({ ok: false }, { status: 413 });
  const strokes = JSON.parse(stored) as Prisma.InputJsonValue;

  try {
    await prisma.teacherBoard.upsert({
      where: { userId },
      create: {
        userId,
        strokes,
        revision: 1n,
      },
      update: {
        strokes,
        revision: { increment: 1 },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to save teacher board', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
