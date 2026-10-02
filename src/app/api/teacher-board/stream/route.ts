import { getSession } from '@/lib/auth/session';
import { subscribeTeacherBoard, type TeacherBoardEvent } from '@/lib/teacher-board/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function frame(data: unknown) {
  let payload = `data: ${JSON.stringify(data)}\n\n`;
  if (payload.length < 2048) payload += `:${' '.repeat(2048 - payload.length)}\n\n`;
  return payload;
}

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || (role !== 'TEACHER' && role !== 'ADMIN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let pendingBoard: string | null = null;
  let pendingLive: string | null = null;
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
  };

  const tryEnqueue = (chunk: string) => {
    if (controller.desiredSize != null && controller.desiredSize <= 0) return false;
    try {
      controller.enqueue(encoder.encode(chunk));
      return true;
    } catch {
      cleanup();
      return false;
    }
  };

  const flush = () => {
    if (closed) return;
    if (pendingBoard != null) {
      if (!tryEnqueue(pendingBoard)) return;
      pendingBoard = null;
    }
    if (pendingLive != null) {
      if (!tryEnqueue(pendingLive)) return;
      pendingLive = null;
    }
  };

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      tryEnqueue(`:${' '.repeat(2048)}\n\n`);
      unsubscribe = subscribeTeacherBoard(userId, (event: TeacherBoardEvent) => {
        const chunk = frame({
          revision: event.revision,
          clientId: event.clientId,
          pages: event.pages,
          currentPageIndex: event.currentPageIndex,
          type: event.type,
          point: event.point,
          pageIndex: event.pageIndex,
          points: event.points,
          stroke: event.stroke,
          strokeWidth: event.strokeWidth,
          inkSeq: event.inkSeq,
        });
        if (event.type === 'laser' || event.type === 'ink') pendingLive = chunk;
        else {
          pendingBoard = chunk;
          pendingLive = null;
        }
        flush();
      });
      heartbeat = setInterval(() => {
        if (pendingBoard == null && pendingLive == null) pendingLive = frame({ type: 'ping' });
        flush();
      }, 5000);
    },
    pull() {
      flush();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Encoding': 'identity',
      'X-Accel-Buffering': 'no',
    },
  });
}
