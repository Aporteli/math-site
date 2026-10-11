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
  type BoardDelta,
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
      board: {
        pages: live.pages,
        currentPageIndex: live.currentPageIndex,
        revision: liveRev,
      },
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
    delta?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 64) : '';
  const inkSeq =
    typeof body.inkSeq === 'number' && Number.isFinite(body.inkSeq) ? body.inkSeq : undefined;

  // ---------- LASER ----------
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
    void broadcastTeacherBoard({
      kind: 'laser',
      userId,
      clientId,
      point,
      pageIndex,
    }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  // ---------- INK ----------
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
      typeof body.base === 'number' && Number.isFinite(body.base)
        ? Math.max(0, Math.floor(body.base))
        : 0;
    publishTeacherBoardInk({
      userId,
      clientId,
      pageIndex,
      points,
      stroke,
      strokeWidth,
      inkSeq,
      base,
    });
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

  // ---------- BOARD ----------
  const safeIndex =
    typeof body.currentPageIndex === 'number' && Number.isFinite(body.currentPageIndex)
      ? Math.max(0, Math.floor(body.currentPageIndex))
      : 0;

  let resolvedPages: unknown[][];
  let clientDelta: BoardDelta | null = null;

  if (body.delta && typeof body.delta === 'object') {
    // ===== DELTA MODE =====
    const deltaObj = body.delta as { updates?: unknown; totalPages?: unknown };
    const rawUpdates = deltaObj.updates;
    if (!Array.isArray(rawUpdates)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // base pages: live memory → DB → fallback
    let basePages: unknown[][];
    const live = readLiveTeacherBoard(userId);
    if (live && isPages(live.pages)) {
      basePages = live.pages as unknown[][];
    } else {
      const record = await prisma.teacherBoard.findUnique({
        where: { userId },
        select: { pages: true },
      });
      basePages = record && isPages(record.pages) ? (record.pages as unknown[][]) : [[]];
    }

    const merged = [...basePages];
    const validUpdates: Array<{ idx: number; elements: unknown }> = [];
    for (const raw of rawUpdates) {
      if (!raw || typeof raw !== 'object') continue;
      const idx = (raw as { idx?: unknown }).idx;
      const elements = (raw as { elements?: unknown }).elements;
      if (typeof idx !== 'number' || !Number.isFinite(idx)) continue;
      const safeIdx = Math.floor(idx);
      if (safeIdx < 0 || safeIdx > 100000) continue;
      if (!Array.isArray(elements)) continue;
      merged[safeIdx] = elements;
      validUpdates.push({ idx: safeIdx, elements });
    }

    let totalPages = merged.length;
    if (typeof deltaObj.totalPages === 'number' && Number.isFinite(deltaObj.totalPages)) {
      const total = Math.floor(deltaObj.totalPages);
      if (total >= 0 && total <= 100000) {
        merged.length = total;
        totalPages = total;
      }
    }

    resolvedPages = merged;
    clientDelta = { updates: validUpdates, totalPages };
  } else if (isPages(body.pages)) {
    // ===== FULL MODE =====
    resolvedPages = body.pages;
    clientDelta = null;
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const revision = publishLiveTeacherBoard({
    userId,
    clientId,
    pages: resolvedPages,
    currentPageIndex: safeIndex,
    inkSeq,
    delta: clientDelta ?? undefined,
  });

  try {
    await persistTeacherBoardSmart(userId, resolvedPages, clientDelta, safeIndex, revision);
  } catch (error) {
    console.error('Failed to save teacher board', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  await broadcastTeacherBoard({
    kind: 'board',
    userId,
    clientId,
    revision,
    inkSeq,
    delta: clientDelta ?? undefined,
    currentPageIndex: safeIndex,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, revision });
}

/**
 * ინახავს დაფას ბაზაში. თუ delta მოწოდებულია — jsonb_set-ით მხოლოდ dirty
 * გვერდებს აახლებს. სხვა შემთხვევაში — სრული upsert.
 */
async function persistTeacherBoardSmart(
  userId: string,
  resolvedPages: unknown[][],
  delta: BoardDelta | null,
  currentPageIndex: number,
  revision: number,
) {
  // ვნახოთ, არსებობს თუ არა ჩანაწერი
  const existing = await prisma.teacherBoard.findUnique({
    where: { userId },
    select: { pages: true },
  });

  if (!existing || !Array.isArray(existing.pages)) {
    // CREATE — სრული ჩაწერა
    await prisma.teacherBoard.create({
      data: {
        userId,
        pages: resolvedPages as Prisma.InputJsonValue,
        currentPageIndex,
        revision: BigInt(revision),
      },
    });
    return;
  }

  const existingPages = existing.pages as unknown[][];

  // თუ delta არ არის, ან გვერდების რაოდენობა შეიცვალა — სრული update
  if (!delta || delta.updates.length === 0 || existingPages.length !== resolvedPages.length) {
    await prisma.teacherBoard.update({
      where: { userId },
      data: {
        pages: resolvedPages as Prisma.InputJsonValue,
        currentPageIndex,
        revision: BigInt(revision),
      },
    });
    return;
  }

  // ✅ DELTA WRITE — მხოლოდ dirty გვერდები jsonb_set-ით
  const validUpdates = delta.updates.filter(
    (u) =>
      Number.isInteger(u.idx) &&
      u.idx >= 0 &&
      u.idx < existingPages.length,
  );

  if (validUpdates.length === 0) {
    await prisma.teacherBoard.update({
      where: { userId },
      data: {
        currentPageIndex,
        revision: BigInt(revision),
      },
    });
    return;
  }

  // jsonb_set-ის ჩადგმული გამოსახულება: jsonb_set(jsonb_set(pages, ARRAY[$1]::text[], $2::jsonb), ARRAY[$3]::text[], $4::jsonb)
  let expr = 'pages';
  const args: unknown[] = [];
  for (const u of validUpdates) {
    const pathIdx = args.length + 1;
    const valIdx = args.length + 2;
    expr = `jsonb_set(${expr}, ARRAY[$${pathIdx}]::text[], $${valIdx}::jsonb)`;
    args.push(String(u.idx));
    args.push(JSON.stringify(u.elements));
  }

  const cpIdx = args.length + 1;
  const revIdx = args.length + 2;
  const uidIdx = args.length + 3;
  args.push(currentPageIndex, BigInt(revision), userId);

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "TeacherBoard"
       SET pages = ${expr},
           "currentPageIndex" = $${cpIdx},
           revision = $${revIdx},
           "updatedAt" = NOW()
       WHERE "userId" = $${uidIdx}`,
      ...args,
    );
  } catch (error) {
    // ✅ fallback — თუ jsonb_set ვერ შესრულდა, სრული update
    console.warn('[teacher-board] jsonb_set failed, falling back to full write', error);
    await prisma.teacherBoard.update({
      where: { userId },
      data: {
        pages: resolvedPages as Prisma.InputJsonValue,
        currentPageIndex,
        revision: BigInt(revision),
      },
    });
  }
}