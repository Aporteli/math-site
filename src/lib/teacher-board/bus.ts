import { Client } from 'pg';
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
  instanceId: string;
  listenStarted: boolean;
  listenClient: Client | null;
  client?: { end: () => Promise<void> } | null;
};

type BoardNotice = {
  origin?: string;
  kind?: 'board' | 'ink' | 'laser';
  userId?: string;
  revision?: number;
  clientId?: string;
  pageIndex?: number;
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  inkSeq?: number;
  base?: number;
  point?: { x: number; y: number } | null;
};

const globalBus = globalThis as typeof globalThis & { __teacherBoardBus?: Bus };

const BOARD_POLL_MS = 2000;

export function boardRevision(value: number | bigint | null | undefined) {
  if (typeof value === 'bigint') return Number(value);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getBus(): Bus {
  if (!globalBus.__teacherBoardBus) {
    globalBus.__teacherBoardBus = {
      handlers: new Map(),
      latest: new Map(),
      inkFloor: new Map(),
      dbRevision: new Map(),
      poll: null,
      polling: false,
      instanceId: crypto.randomUUID(),
      listenStarted: false,
      listenClient: null,
    };
  }
  const bus = globalBus.__teacherBoardBus;
  if (!bus.latest) bus.latest = new Map();
  if (!bus.inkFloor) bus.inkFloor = new Map();
  if (!bus.dbRevision) bus.dbRevision = new Map();
  if (bus.poll === undefined) bus.poll = null;
  if (bus.polling === undefined) bus.polling = false;
  if (!bus.instanceId) bus.instanceId = crypto.randomUUID();
  if (bus.listenStarted === undefined) bus.listenStarted = false;
  if (bus.listenClient === undefined) bus.listenClient = null;
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
  try {
    dispatch({
      userId: input.userId,
      clientId: input.clientId,
      revision,
      pages: input.pages,
      currentPageIndex: input.currentPageIndex,
      inkSeq: input.inkSeq,
    });
  } catch {
    // A live subscriber must not stop the board from being stored.
  }
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
      const revision = boardRevision(row.revision);
      const previous = bus.dbRevision.get(row.userId);
      if (previous === revision) continue;
      changed.push(row.userId);
    }
    if (changed.length === 0) return;

    const boards = await prisma.teacherBoard.findMany({
      where: { userId: { in: changed } },
      select: { userId: true, revision: true, pages: true, currentPageIndex: true },
    });
    for (const board of boards) {
      const revision = boardRevision(board.revision);
      bus.dbRevision.set(board.userId, revision);
      dispatch({
        userId: board.userId,
        clientId: '',
        revision,
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

const NOTIFY_LIMIT = 7000;

export async function broadcastTeacherBoard(notice: Record<string, unknown>) {
  const payload = JSON.stringify({ ...notice, origin: getBus().instanceId });
  if (payload.length > NOTIFY_LIMIT) return;
  await prisma.$queryRaw`SELECT pg_notify('teacher_board', ${payload})`;
}

function createListenClient() {
  const url = process.env.DATABASE_URL;
  const ca = process.env.DATABASE_CA;
  if (!url || !ca) return null;
  return new Client({
    connectionString: url,
    ssl: { ca, rejectUnauthorized: true },
  });
}

async function deliverBoardNotice(raw: string) {
  let notice: BoardNotice;
  try {
    notice = JSON.parse(raw) as BoardNotice;
  } catch {
    return;
  }
  if (!notice.userId || notice.origin === getBus().instanceId) return;
  if (!getBus().handlers.has(notice.userId)) return;

  if (notice.kind === 'board') {
    const record = await prisma.teacherBoard.findUnique({
      where: { userId: notice.userId },
      select: { pages: true, currentPageIndex: true, revision: true },
    });
    if (!record || !Array.isArray(record.pages)) return;
    const revision = boardRevision(record.revision);
    getBus().latest.set(notice.userId, {
      revision,
      pages: record.pages,
      currentPageIndex: record.currentPageIndex,
    });
    getBus().dbRevision.set(notice.userId, revision);
    dispatch({
      userId: notice.userId,
      clientId: notice.clientId ?? '',
      revision,
      pages: record.pages,
      currentPageIndex: record.currentPageIndex,
      inkSeq: notice.inkSeq,
    });
    return;
  }

  if (notice.kind === 'ink') {
    const points = Array.isArray(notice.points) ? notice.points.filter((n) => typeof n === 'number') : [];
    dispatch({
      userId: notice.userId,
      clientId: notice.clientId ?? '',
      revision: 0,
      type: 'ink',
      pageIndex: notice.pageIndex,
      points,
      stroke: notice.stroke,
      strokeWidth: notice.strokeWidth,
      inkSeq: notice.inkSeq,
      base: notice.base,
    });
    return;
  }

  if (notice.kind === 'laser') {
    dispatch({
      userId: notice.userId,
      clientId: notice.clientId ?? '',
      revision: 0,
      type: 'laser',
      point: notice.point ?? null,
      pageIndex: notice.pageIndex,
    });
  }
}

async function connectListen() {
  const bus = getBus();
  if (bus.listenClient) return;
  const client = createListenClient();
  if (!client) return;
  bus.listenClient = client;
  client.on('notification', (message) => {
    if (message.channel !== 'teacher_board' || !message.payload) return;
    void deliverBoardNotice(message.payload);
  });
  client.on('error', () => {
    if (getBus().listenClient === client) getBus().listenClient = null;
    void client.end().catch(() => undefined);
    setTimeout(() => void connectListen(), 1000);
  });
  try {
    await client.connect();
    await client.query('LISTEN teacher_board');
  } catch {
    if (getBus().listenClient === client) getBus().listenClient = null;
    void client.end().catch(() => undefined);
    setTimeout(() => void connectListen(), 1000);
  }
}

function ensureListen() {
  const bus = getBus();
  if (bus.listenStarted) return;
  bus.listenStarted = true;
  void connectListen();
}

export function subscribeTeacherBoard(userId: string, handler: Handler) {
  const bus = getBus();
  ensureListen();
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
