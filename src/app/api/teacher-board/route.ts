import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { publishLiveTeacherBoard, publishTeacherBoardLaser, readLiveTeacherBoard } from '@/lib/teacher-board/bus';

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

  const live = readLiveTeacherBoard(userId);
  if (live && isPages(live.pages)) {
    return NextResponse.json({
      board: { pages: live.pages, currentPageIndex: live.currentPageIndex, revision: live.revision },
    });
  }

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

  let body: {
    type?: unknown;
    point?: unknown;
    pageIndex?: unknown;
    pages?: unknown;
    currentPageIndex?: unknown;
    clientId?: unknown;
  };  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 64) : '';
  if (body.type === 'laser') {
    const pageIndex =
      typeof body.pageIndex === 'number' && Number.isFinite(body.pageIndex)
        ? Math.max(0, Math.floor(body.pageIndex))
        : 0;
    const raw = body.point;
    const point =
      raw &&
      typeof raw === 'object' &&
      typeof (raw as { x?: unknown }).x === 'number' &&
      typeof (raw as { y?: unknown }).y === 'number'
        ? { x: (raw as { x: number }).x, y: (raw as { y: number }).y }
        : null;
    publishTeacherBoardLaser({ userId, clientId, point, pageIndex });
    return NextResponse.json({ ok: true });
  }

  if (!isPages(body.pages)) return NextResponse.json({ ok: false }, { status: 400 });

  const safeIndex = typeof body.currentPageIndex === 'number' && Number.isFinite(body.currentPageIndex)
    ? Math.max(0, Math.floor(body.currentPageIndex))
    : 0;

  const revision = publishLiveTeacherBoard({
    userId,
    clientId,
    pages: body.pages,
    currentPageIndex: safeIndex,
  });
  schedulePersist(userId);

  return NextResponse.json({ ok: true, revision });
}

const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function schedulePersist(userId: string) {
  const existing = persistTimers.get(userId);
  if (existing) clearTimeout(existing);
  persistTimers.set(
    userId,
    setTimeout(() => {
      persistTimers.delete(userId);
      const live = readLiveTeacherBoard(userId);
      if (!live || !isPages(live.pages)) return;
      const pages = live.pages as Prisma.InputJsonValue;
      void prisma.teacherBoard
        .upsert({
          where: { userId },
          create: { userId, pages, currentPageIndex: live.currentPageIndex, revision: live.revision },
          update: { pages, currentPageIndex: live.currentPageIndex, revision: live.revision },
        })
        .catch(() => {});
    }, 400),
  );
}
