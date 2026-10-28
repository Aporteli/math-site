import { Client } from 'pg';
import { prisma } from '@/lib/prisma';
import { applyBoardDelta, type BoardChange } from '@/lib/teacher-board/delta';

export type TeacherBoardPageChange = BoardChange<{ id: string; type: string }>;

export type TeacherBoardEvent = {
  userId: string;
  revision: number;
  clientId: string;
  pages?: unknown;
  currentPageIndex?: number;
  type?: 'laser' | 'ink' | 'delta';
  point?: { x: number; y: number } | null;
  pageIndex?: number;
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  inkSeq?: number;
  base?: number;
  pageCount?: number;
  changes?: TeacherBoardPageChange[];
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
  writeTail: Map<string, Promise<unknown>>;
  poll: ReturnType<typeof setInterval> | null;
  polling: boolean;
  instanceId: string;
  listenStarted: boolean;
  listenClient: Client | null;
  client?: { end: () => Promise<void> } | null;
};

type BoardNotice = {
  origin?: string;
  kind?: 'board' | 'ink' | 'laser' | 'delta';
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
  pageCount?: number;
  currentPageIndex?: number;
  changes?: TeacherBoardPageChange[];
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
      writeTail: new Map(),
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
  if (!bus.writeTail) bus.writeTail = new Map();
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

function takeRevision(userId: string, inkSeq?: number) {
  const bus = getBus();
  const prev = bus.latest.get(userId)?.revision ?? 0;
  let revision = Date.now();
  if (revision <= prev) revision = prev + 1;
  if (typeof inkSeq === 'number') {
    const floor = bus.inkFloor.get(userId) ?? 0;
    if (inkSeq > floor) bus.inkFloor.set(userId, inkSeq);
  }
  return revision;
}

export function withTeacherBoardLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const bus = getBus();
  const previous = bus.writeTail.get(userId) ?? Promise.resolve();
  const run = previous.then(task, task);
  bus.writeTail.set(
    userId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export function noteTeacherBoardStored(userId: string, revision: number) {
  getBus().dbRevision.set(userId, revision);
}

export function publishLiveTeacherBoard(input: {
  userId: string;
  clientId: string;
  pages: unknown;
  currentPageIndex: number;
  inkSeq?: number;
}) {
  const revision = takeRevision(input.userId, input.inkSeq);
  const live = { revision, pages: input.pages, currentPageIndex: input.currentPageIndex };
  getBus().latest.set(input.userId, live);
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

export function publishTeacherBoardDelta(input: {
  userId: string;
  clientId: string;
  pages: unknown;
  currentPageIndex: number;
  inkSeq?: number;
  pageCount: number;
  changes: TeacherBoardPageChange[];
}) {
  const revision = takeRevision(input.userId, input.inkSeq);
  getBus().latest.set(input.userId, {
    revision,
    pages: input.pages,
    currentPageIndex: input.currentPageIndex,
  });
  try {
    dispatch({
      userId: input.userId,
      clientId: input.clientId,
      revision,
      currentPageIndex: input.currentPageIndex,
      inkSeq: input.inkSeq,
      type: 'delta',
      pageCount: input.pageCount,
      changes: input.changes,
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

const endedListenClients = new WeakSet<Client>();

function endListenClient(client: Client) {
  if (endedListenClients.has(client)) return;
  endedListenClients.add(client);
  void client.end().catch(() => undefined);
}

function scheduleListenReconnect() {
  setTimeout(() => {
    const bus = getBus();
    if (subscriberCount(bus) === 0) {
      bus.listenStarted = false;
      return;
    }
    void connectListen();
  }, 1000);
}

function listenClientStillCurrent(client: Client) {
  const bus = getBus();
  if (bus.listenClient === client && subscriberCount(bus) > 0) return true;
  if (bus.listenClient === client) {
    bus.listenClient = null;
    bus.listenStarted = false;
  }
  endListenClient(client);
  return false;
}

function stopPollIfIdle() {
  const bus = getBus();
  if (subscriberCount(bus) > 0) return;
  if (bus.poll) {
    clearInterval(bus.poll);
    bus.poll = null;
  }
  const client = bus.listenClient;
  bus.listenClient = null;
  bus.listenStarted = false;
  if (client) endListenClient(client);
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
      const live = bus.latest.get(row.userId);
      if (live && live.revision >= revision) {
        bus.dbRevision.set(row.userId, revision);
        continue;
      }
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

  if (notice.kind === 'delta') {
    const revision = typeof notice.revision === 'number' && Number.isFinite(notice.revision) ? notice.revision : 0;
    const record = await prisma.teacherBoard.findUnique({
      where: { userId: notice.userId },
      select: { pages: true, currentPageIndex: true, revision: true },
    });
    const bus = getBus();
    const dbRevision = record ? boardRevision(record.revision) : 0;
    const storedPages = record && Array.isArray(record.pages) ? record.pages : bus.latest.get(notice.userId)?.pages;
    const pageCount = typeof notice.pageCount === 'number' ? notice.pageCount : 0;
    const changes = Array.isArray(notice.changes) ? notice.changes : [];
    let pages = storedPages;
    if (
      dbRevision < revision &&
      Array.isArray(pages) &&
      pages.every((page) => Array.isArray(page)) &&
      pageCount > 0
    ) {
      pages = applyBoardDelta(pages as { id: string }[][], { pageCount, changes });
    }
    if (Array.isArray(pages)) {
      const currentPageIndex =
        typeof notice.currentPageIndex === 'number'
          ? notice.currentPageIndex
          : (record?.currentPageIndex ?? 0);
      const liveRevision = Math.max(revision, dbRevision);
      bus.latest.set(notice.userId, { revision: liveRevision, pages, currentPageIndex });
      bus.dbRevision.set(notice.userId, liveRevision);
    }
    dispatch({
      userId: notice.userId,
      clientId: notice.clientId ?? '',
      revision,
      type: 'delta',
      currentPageIndex: notice.currentPageIndex,
      pageCount: notice.pageCount,
      changes,
      inkSeq: notice.inkSeq,
    });
    return;
  }

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
  if (subscriberCount(bus) === 0) {
    bus.listenStarted = false;
    return;
  }
  if (bus.listenClient) return;
  const client = createListenClient();
  if (!client) return;
  bus.listenClient = client;
  client.on('notification', (message) => {
    if (message.channel !== 'teacher_board' || !message.payload) return;
    void deliverBoardNotice(message.payload);
  });
  client.on('error', () => {
    const current = getBus();
    if (current.listenClient !== client) return;
    current.listenClient = null;
    endListenClient(client);
    if (subscriberCount(current) === 0) {
      current.listenStarted = false;
      return;
    }
    scheduleListenReconnect();
  });
  try {
    await client.connect();
    if (!listenClientStillCurrent(client)) return;
    await client.query('LISTEN teacher_board');
    if (!listenClientStillCurrent(client)) return;
  } catch {
    const current = getBus();
    if (current.listenClient !== client) return;
    current.listenClient = null;
    endListenClient(client);
    if (subscriberCount(current) === 0) {
      current.listenStarted = false;
      return;
    }
    scheduleListenReconnect();
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
