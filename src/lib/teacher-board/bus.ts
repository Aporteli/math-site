import { Client } from 'pg';

export type TeacherBoardEvent = {
  userId: string;
  revision: number;
  clientId: string;
  pages?: unknown;
  currentPageIndex?: number;
};

type Handler = (event: TeacherBoardEvent) => void;

type Bus = {
  handlers: Map<string, Set<Handler>>;
  client: Client | null;
  ready: Promise<void> | null;
};

const globalBus = globalThis as typeof globalThis & { __teacherBoardBus?: Bus };

function getBus(): Bus {
  if (!globalBus.__teacherBoardBus) {
    globalBus.__teacherBoardBus = { handlers: new Map(), client: null, ready: null };
  }
  return globalBus.__teacherBoardBus;
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
