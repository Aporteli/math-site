import { Client } from 'pg';

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
  client: Client | null;
  ready: Promise<void> | null;
};

const globalBus = globalThis as typeof globalThis & { __teacherBoardBus?: Bus };

function getBus(): Bus {
  if (!globalBus.__teacherBoardBus) {
    globalBus.__teacherBoardBus = { handlers: new Map(), latest: new Map(), client: null, ready: null };
  }
  if (!globalBus.__teacherBoardBus.latest) globalBus.__teacherBoardBus.latest = new Map();
  return globalBus.__teacherBoardBus;
}

export function publishLiveTeacherBoard(input: {
  userId: string;
  clientId: string;
  pages: unknown;
  currentPageIndex: number;
}) {
  const bus = getBus();
  const prev = bus.latest.get(input.userId)?.revision ?? 0;
  let revision = Date.now();
  if (revision <= prev) revision = prev + 1;
  const live = { revision, pages: input.pages, currentPageIndex: input.currentPageIndex };
  bus.latest.set(input.userId, live);
  dispatch({
    userId: input.userId,
    clientId: input.clientId,
    revision,
    pages: input.pages,
    currentPageIndex: input.currentPageIndex,
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
}) {
  dispatch({
    userId: input.userId,
    clientId: input.clientId,
    revision: 0,
    type: 'ink',
    pageIndex: input.pageIndex,
    points: input.points,
    stroke: input.stroke,
    strokeWidth: input.strokeWidth,
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

function ensureListen() {
  const bus = getBus();
  if (bus.ready) return bus.ready;
  const url = process.env.DATABASE_URL;
  if (!url) return Promise.resolve();

  const client = new Client({ connectionString: url });
  bus.client = client;
  bus.ready = (async () => {
    await client.connect();
    await client.query('LISTEN teacher_board');
    client.on('notification', (msg) => {
      if (msg.channel !== 'teacher_board' || !msg.payload) return;
      try {
        const event = JSON.parse(msg.payload) as TeacherBoardEvent;
        if (!event?.userId || typeof event.revision !== 'number') return;
        dispatch({ userId: event.userId, revision: event.revision, clientId: event.clientId ?? '' });
      } catch {
        /* ignore malformed payload */
      }
    });
    client.on('error', () => {
      bus.ready = null;
      bus.client = null;
    });
  })().catch(() => {
    bus.ready = null;
    bus.client = null;
  });
  return bus.ready;
}

export function subscribeTeacherBoard(userId: string, handler: Handler) {
  const bus = getBus();
  let set = bus.handlers.get(userId);
  if (!set) {
    set = new Set();
    bus.handlers.set(userId, set);
  }
  set.add(handler);
  void ensureListen();
  return () => {
    set.delete(handler);
    if (set.size === 0) bus.handlers.delete(userId);
  };
}
