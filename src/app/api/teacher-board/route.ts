import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { teacherBoardUserId } from '@/lib/teacher-board/actor';
import {
  boardRevision,
  broadcastTeacherBoard,
  publishLiveTeacherBoard,
  publishTeacherBoardInk,
  publishTeacherBoardLaser,
  readLiveTeacherBoard,
} from '@/lib/teacher-board/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isPages(value: unknown): value is unknown[][] {
  return Array.isArray(value) && value.every((page) => Array.isArray(page));
}

export async function GET(req: Request) {
  const userId = await teacherBoardUserId(req);
  if (!userId) return NextResponse.json({ board: null }, { status: 401 });

  const live = readLiveTeacherBoard(userId);
  const record = await prisma.teacherBoard.findUnique({
    where: { userId },
    select: { pages: true, currentPageIndex: true, revision: true },
  });
  const liveRev = live && isPages(live.pages) ? live.revision : 0;
  const dbRev = record && isPages(record.pages) ? boardRevision(record.revision) : 0;

  if (live && isPages(live.pages) && liveRev >= dbRev && liveRev > 0) {
    return NextResponse.json({
      board: { pages: live.pages, currentPageIndex: live.currentPageIndex, revision: liveRev },
    });
  }

  if (record && isPages(record.pages)) {
    return NextResponse.json({
      board: {
        pages: record.pages,
        currentPageIndex: record.currentPageIndex,
        revision: dbRev,
      },
    });
  }

  return NextResponse.json({ board: null });
}

export async function POST(req: Request) {
  const userId = await teacherBoardUserId(req);
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: {
    type?: unknown;
    point?: unknown;
    pageIndex?: unknown;
    pages?: unknown;
    currentPageIndex?: unknown;
    clientId?: unknown;
    points?: unknown;
    stroke?: unknown;
    strokeWidth?: unknown;
    inkSeq?: unknown;
    base?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 64) : '';
  const inkSeq = typeof body.inkSeq === 'number' && Number.isFinite(body.inkSeq) ? body.inkSeq : undefined;
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
    void broadcastTeacherBoard({ kind: 'laser', userId, clientId, point, pageIndex }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'ink') {
    const pageIndex =
      typeof body.pageIndex === 'number' && Number.isFinite(body.pageIndex)
        ? Math.max(0, Math.floor(body.pageIndex))
        : 0;
    const points = Array.isArray(body.points)
      ? body.points.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).slice(0, 20000)
      : [];
    const stroke = typeof body.stroke === 'string' ? body.stroke.slice(0, 32) : '#111111';
    const strokeWidth =
      typeof body.strokeWidth === 'number' && Number.isFinite(body.strokeWidth)
        ? Math.min(64, Math.max(0.5, body.strokeWidth))
        : 2;
    const base =
      typeof body.base === 'number' && Number.isFinite(body.base) ? Math.max(0, Math.floor(body.base)) : 0;
    publishTeacherBoardInk({ userId, clientId, pageIndex, points, stroke, strokeWidth, inkSeq, base });
    void broadcastTeacherBoard({
      kind: 'ink',
      userId,
      clientId,
      pageIndex,
      points,
      stroke,
      strokeWidth,
      inkSeq,
      base,
    }).catch(() => undefined);
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
    inkSeq,
  });
  await persistTeacherBoard(userId);
  await broadcastTeacherBoard({ kind: 'board', userId, clientId, revision, inkSeq }).catch(() => undefined);

  return NextResponse.json({ ok: true, revision });
}

async function persistTeacherBoard(userId: string) {
  const live = readLiveTeacherBoard(userId);
  if (!live || !isPages(live.pages)) return;
  const pages = live.pages as Prisma.InputJsonValue;
  await prisma.teacherBoard.upsert({
    where: { userId },
    create: { userId, pages, currentPageIndex: live.currentPageIndex, revision: BigInt(live.revision) },
    update: { pages, currentPageIndex: live.currentPageIndex, revision: BigInt(live.revision) },
  });
}
