import { prisma } from '@/lib/prisma';

export type TeacherBoardEvent = {
  userId: string;
  revision: number;
  clientId: string;
  pages?: unknown;
  currentPageIndex?: number;
  type?: 'laser' | 'ink';
  point?: { x: number; y: number } | null;
  pageIndex?: number;
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  inkSeq?: number;
  base?: number;
};

type Handler = (event: TeacherBoardEvent) => void;

type LiveBoard = {
  revision: number;
  pages: unknown;
  currentPageIndex: number;
};

type Bus = {
  handlers: Map<string, Set<Handler>>;
  latest: Map<string, LiveBoard>;
  inkFloor: Map<string, number>;
  dbRevision: Map<string, number>;
  poll: ReturnType<typeof setInterval> | null;
  polling: boolean;
  client?: { end: () => Promise<void> } | null;
};

const globalBus = globalThis as typeof globalThis & { __teacherBoardBus?: Bus };

const BOARD_POLL_MS = 2000;

function getBus(): Bus {
  if (!globalBus.__teacherBoardBus) {
    globalBus.__teacherBoardBus = {
      handlers: new Map(),
      latest: new Map(),
      inkFloor: new Map(),
      dbRevision: new Map(),
      poll: null,
      polling: false,
    };
  }
  const bus = globalBus.__teacherBoardBus;
  if (!bus.latest) bus.latest = new Map();
  if (!bus.inkFloor) bus.inkFloor = new Map();
  if (!bus.dbRevision) bus.dbRevision = new Map();
  if (bus.poll === undefined) bus.poll = null;
  if (bus.polling === undefined) bus.polling = false;
  if (bus.client) {
    const leftover = bus.client;
    bus.client = null;
    void leftover.end().catch(() => undefined);
  }
  return bus;
}

function subscriberCount(bus: Bus) {
  let count = 0;
  for (const handlers of bus.handlers.values()) count += handlers.size;
  return count;
}

export function publishLiveTeacherBoard(input: {
  userId: string;
  clientId: string;
  pages: unknown;
  currentPageIndex: number;
  inkSeq?: number;
}) {
  const bus = getBus();
  const prev = bus.latest.get(input.userId)?.revision ?? 0;
  let revision = Date.now();
  if (revision <= prev) revision = prev + 1;
  if (typeof input.inkSeq === 'number') {
    const floor = bus.inkFloor.get(input.userId) ?? 0;
    if (input.inkSeq > floor) bus.inkFloor.set(input.userId, input.inkSeq);
  }
  const live = { revision, pages: input.pages, currentPageIndex: input.currentPageIndex };
  bus.latest.set(input.userId, live);
  dispatch({
    userId: input.userId,
    clientId: input.clientId,
    revision,
    pages: input.pages,
    currentPageIndex: input.currentPageIndex,
    inkSeq: input.inkSeq,
  });
  return revision;
}

export function readLiveTeacherBoard(userId: string) {
  return getBus().latest.get(userId) ?? null;
}

export function publishTeacherBoardLaser(input: {
  userId: string;
  clientId: string;
  point: { x: number; y: number } | null;
  pageIndex: number;
}) {
  dispatch({
    userId: input.userId,
    clientId: input.clientId,
    revision: 0,
    type: 'laser',
    point: input.point,
    pageIndex: input.pageIndex,
  });
}

export function publishTeacherBoardInk(input: {
  userId: string;
  clientId: string;
  pageIndex: number;
  points: number[];
  stroke: string;
  strokeWidth: number;
  inkSeq?: number;
  base?: number;
}) {
  const bus = getBus();
  const floor = bus.inkFloor.get(input.userId) ?? 0;
  if (typeof input.inkSeq === 'number' && input.inkSeq < floor) return;
  dispatch({
    userId: input.userId,
    clientId: input.clientId,
    revision: 0,
    type: 'ink',
    pageIndex: input.pageIndex,
    points: input.points,
    stroke: input.stroke,
    strokeWidth: input.strokeWidth,
    inkSeq: input.inkSeq,
    base: input.base,
  });
}

function dispatch(event: TeacherBoardEvent) {
  const set = getBus().handlers.get(event.userId);
  if (!set) return;
  for (const handler of set) handler(event);
}

export function publishTeacherBoard(event: TeacherBoardEvent) {
  dispatch(event);
}

function stopPollIfIdle() {
  const bus = getBus();
  if (subscriberCount(bus) > 0 || !bus.poll) return;
  clearInterval(bus.poll);
  bus.poll = null;
}

async function pollStoredBoards() {
  const bus = getBus();
  if (bus.polling) return;
  const userIds = [...bus.handlers.keys()];
  if (userIds.length === 0) {
    stopPollIfIdle();
    return;
  }

  bus.polling = true;
  try {
    const heads = await prisma.teacherBoard.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, revision: true },
    });
    const changed: string[] = [];
    for (const row of heads) {
      const previous = bus.dbRevision.get(row.userId);
      if (previous === row.revision) continue;
      changed.push(row.userId);
    }
    if (changed.length === 0) return;

    const boards = await prisma.teacherBoard.findMany({
      where: { userId: { in: changed } },
      select: { userId: true, revision: true, pages: true, currentPageIndex: true },
    });
    for (const board of boards) {
      bus.dbRevision.set(board.userId, board.revision);
      dispatch({
        userId: board.userId,
        clientId: '',
        revision: board.revision,
        pages: board.pages,
        currentPageIndex: board.currentPageIndex,
      });
    }
  } catch {
    /* The SSE client refetches when the stream goes quiet. */
  } finally {
    bus.polling = false;
  }
}

function ensurePoll() {
  const bus = getBus();
  if (bus.poll) return;
  const timer = setInterval(() => {
    void pollStoredBoards();
  }, BOARD_POLL_MS);
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    timer.unref();
  }
  bus.poll = timer;
}

export function subscribeTeacherBoard(userId: string, handler: Handler) {
  const bus = getBus();
  let set = bus.handlers.get(userId);
  if (!set) {
    set = new Set();
    bus.handlers.set(userId, set);
  }
  set.add(handler);
  ensurePoll();
  return () => {
    set.delete(handler);
    if (set.size === 0) {
      bus.handlers.delete(userId);
      bus.dbRevision.delete(userId);
    }
    stopPollIfIdle();
  };
}
