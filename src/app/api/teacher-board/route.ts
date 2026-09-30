import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { publishTeacherBoard } from '@/lib/teacher-board/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function teacherId() {
  const session = await getSession();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || (role !== 'TEACHER' && role !== 'ADMIN')) return null;
  return userId;
}

function isPages(value: unknown): value is unknown[][] {
  return Array.isArray(value) && value.every((page) => Array.isArray(page));
}

export async function GET() {
  const userId = await teacherId();
  if (!userId) return NextResponse.json({ board: null }, { status: 401 });

  const record = await prisma.teacherBoard.findUnique({
    where: { userId },
    select: { pages: true, currentPageIndex: true, revision: true },
  });
  if (!record || !isPages(record.pages)) return NextResponse.json({ board: null });

  return NextResponse.json({
    board: {
      pages: record.pages,
      currentPageIndex: record.currentPageIndex,
      revision: record.revision,
    },
  });
}

export async function POST(req: Request) {
  const userId = await teacherId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { pages?: unknown; currentPageIndex?: unknown; clientId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!isPages(body.pages)) return NextResponse.json({ ok: false }, { status: 400 });

  const safePages = JSON.parse(JSON.stringify(body.pages)) as Prisma.InputJsonValue;
  const safeIndex = typeof body.currentPageIndex === 'number' && Number.isFinite(body.currentPageIndex)
    ? Math.max(0, Math.floor(body.currentPageIndex))
    : 0;
  const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 64) : '';

  const record = await prisma.teacherBoard.upsert({
    where: { userId },
    create: { userId, pages: safePages, currentPageIndex: safeIndex, revision: 1 },
    update: { pages: safePages, currentPageIndex: safeIndex, revision: { increment: 1 } },
    select: { revision: true },
  });

  const event = {
    userId,
    revision: record.revision,
    clientId,
    pages: body.pages,
    currentPageIndex: safeIndex,
  };
  publishTeacherBoard(event);
  const notifyPayload = JSON.stringify({ userId, revision: record.revision, clientId });
  void prisma.$executeRaw`SELECT pg_notify('teacher_board', ${notifyPayload})`.catch(() => {});

  return NextResponse.json({ ok: true, revision: record.revision });
}
