import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { teacherBoardUserId } from '@/lib/teacher-board/actor';
import { applyBoardDelta, type BoardChange, type BoardDelta } from '@/lib/teacher-board/delta';
import {
  boardRevision,
  broadcastTeacherBoard,
  noteTeacherBoardStored,
  publishLiveTeacherBoard,
  publishTeacherBoardDelta,
  publishTeacherBoardInk,
  publishTeacherBoardLaser,
  readLiveTeacherBoard,
  withTeacherBoardLock,
} from '@/lib/teacher-board/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isPages(value: unknown): value is unknown[][] {
  return Array.isArray(value) && value.every((page) => Array.isArray(page));
}

function isDeltaElement(value: unknown): value is { id: string; type: string } {
  if (!value || typeof value !== 'object') return false;
  const element = value as { id?: unknown; type?: unknown };
  return typeof element.id === 'string' && element.id.length > 0 && element.id.length <= 80 && typeof element.type === 'string' && element.type.length > 0 && element.type.length <= 40;
}

function parseBoardDelta(body: {
  pageCount?: unknown;
  currentPageIndex?: unknown;
  changes?: unknown;
}): BoardDelta<{ id: string; type: string }> | null {
  const pageCount =
    typeof body.pageCount === 'number' && Number.isFinite(body.pageCount) ? Math.floor(body.pageCount) : 0;
  if (pageCount < 1 || pageCount > 200) return null;
  const currentPageIndex =
    typeof body.currentPageIndex === 'number' && Number.isFinite(body.currentPageIndex)
      ? Math.min(pageCount - 1, Math.max(0, Math.floor(body.currentPageIndex)))
      : 0;
  const changes: BoardChange<{ id: string; type: string }>[] = [];
  if (Array.isArray(body.changes)) {
    for (const entry of body.changes) {
      if (!entry || typeof entry !== 'object') continue;
      const pageIndex = (entry as { pageIndex?: unknown }).pageIndex;
      if (typeof pageIndex !== 'number' || !Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
        continue;
      }
      const added = Array.isArray((entry as { added?: unknown }).added)
        ? ((entry as { added: unknown[] }).added.filter(isDeltaElement))
        : [];
      const updated = Array.isArray((entry as { updated?: unknown }).updated)
        ? ((entry as { updated: unknown[] }).updated.filter(isDeltaElement))
        : [];
      const deleted = Array.isArray((entry as { deleted?: unknown }).deleted)
        ? (entry as { deleted: unknown[] }).deleted.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 80)
        : [];
      if (added.length === 0 && updated.length === 0 && deleted.length === 0) continue;
      changes.push({ pageIndex, added, updated, deleted });
    }
  }
  return { pageCount, currentPageIndex, changes };
}

async function readStoredPages(userId: string) {
  const live = readLiveTeacherBoard(userId);
  if (live && isPages(live.pages) && live.pages.length > 0) {
    return { pages: live.pages, currentPageIndex: live.currentPageIndex };
  }
  const record = await prisma.teacherBoard.findUnique({
    where: { userId },
    select: { pages: true, currentPageIndex: true },
  });
  if (record && isPages(record.pages) && record.pages.length > 0) {
    return { pages: record.pages, currentPageIndex: record.currentPageIndex };
  }
  return { pages: [[]] as unknown[][], currentPageIndex: 0 };
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
    pageCount?: unknown;
    changes?: unknown;
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

  if (body.type === 'delta') {
    const delta = parseBoardDelta(body);
    if (!delta) return NextResponse.json({ ok: false }, { status: 400 });
    try {
      const revision = await withTeacherBoardLock(userId, async () => {
        const current = await readStoredPages(userId);
        const merged = applyBoardDelta(current.pages as { id: string }[][], delta);
        const revision = publishTeacherBoardDelta({
          userId,
          clientId,
          pages: merged,
          currentPageIndex: delta.currentPageIndex,
          inkSeq,
          pageCount: delta.pageCount,
          changes: delta.changes,
        });
        await persistTeacherBoard(userId, merged, delta.currentPageIndex, revision);
        noteTeacherBoardStored(userId, revision);
        return revision;
      });
      void broadcastTeacherBoard({
        kind: 'delta',
        userId,
        clientId,
        revision,
        inkSeq,
        currentPageIndex: delta.currentPageIndex,
        pageCount: delta.pageCount,
        changes: delta.changes,
      }).catch(() => undefined);
      return NextResponse.json({ ok: true, revision });
    } catch (error) {
      console.error('Failed to save teacher board', error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  if (!isPages(body.pages)) return NextResponse.json({ ok: false }, { status: 400 });

  const safeIndex = typeof body.currentPageIndex === 'number' && Number.isFinite(body.currentPageIndex)
    ? Math.max(0, Math.floor(body.currentPageIndex))
    : 0;

  try {
    const revision = await withTeacherBoardLock(userId, async () => {
      const revision = publishLiveTeacherBoard({
        userId,
        clientId,
        pages: body.pages,
        currentPageIndex: safeIndex,
        inkSeq,
      });
      await persistTeacherBoard(userId, body.pages as unknown[][], safeIndex, revision);
      noteTeacherBoardStored(userId, revision);
      return revision;
    });
    void broadcastTeacherBoard({ kind: 'board', userId, clientId, revision, inkSeq }).catch(() => undefined);
    return NextResponse.json({ ok: true, revision });
  } catch (error) {
    console.error('Failed to save teacher board', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function persistTeacherBoard(
  userId: string,
  pages: unknown[][],
  currentPageIndex: number,
  revision: number,
) {
  const stored = pages as Prisma.InputJsonValue;
  await prisma.teacherBoard.upsert({
    where: { userId },
    create: { userId, pages: stored, currentPageIndex, revision: BigInt(revision) },
    update: { pages: stored, currentPageIndex, revision: BigInt(revision) },
  });
}
