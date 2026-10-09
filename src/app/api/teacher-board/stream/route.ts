import { subscribeTeacherBoard, type TeacherBoardEvent } from '@/lib/teacher-board/bus';
import { teacherBoardUserId } from '@/lib/teacher-board/actor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function frame(data: unknown, eventId: string) {
  let payload = `id: ${eventId}\ndata: ${JSON.stringify(data)}\n\n`;
  if (payload.length < 2048) payload += `:${' '.repeat(2048 - payload.length)}\n\n`;
  return payload;
}

export async function GET(req: Request) {
  const userId = await teacherBoardUserId(req);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const streamUrl = new URL(req.url);
  const subscriberClientId = streamUrl.searchParams.get('clientId')?.slice(0, 64) ?? '';
  const revisionHeader = Number(streamUrl.searchParams.get('revision'));
  let lastOwnRevision = Number.isFinite(revisionHeader) && revisionHeader > 0 ? revisionHeader : 0;

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let pendingBoard: string | null = null;
  let pendingLive: string | null = null;
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
    if (retry) clearTimeout(retry);
  };

  const armRetry = () => {
    if (retry != null || closed) return;
    retry = setTimeout(() => {
      retry = undefined;
      flush();
    }, 40);
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
      if (!tryEnqueue(pendingBoard)) {
        armRetry();
        return;
      }
      pendingBoard = null;
    }
    if (pendingLive != null) {
      if (!tryEnqueue(pendingLive)) {
        armRetry();
        return;
      }
      pendingLive = null;
    }
  };

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      tryEnqueue(`:${' '.repeat(2048)}\n\n`);
      unsubscribe = subscribeTeacherBoard(userId, (event: TeacherBoardEvent) => {
        const own = subscriberClientId.length > 0 && event.clientId === subscriberClientId;
        if (own && (event.type === 'ink' || event.type === 'laser')) return;
        if (own && !event.type && typeof event.revision === 'number' && event.revision > lastOwnRevision) {
          lastOwnRevision = event.revision;
        }

        const echo =
          !event.type &&
          subscriberClientId.length > 0 &&
          typeof event.revision === 'number' &&
          event.revision > 0 &&
          event.revision <= lastOwnRevision;

        const eventId =
          event.type === 'ink'
            ? `i${event.inkSeq ?? 0}`
            : event.type === 'laser'
              ? 'l'
              : typeof event.revision === 'number'
                ? `r${event.revision}`
                : 'b';
        const chunk = frame(
          echo
            ? {
                revision: event.revision,
                clientId: subscriberClientId,
                currentPageIndex: event.currentPageIndex,
                inkSeq: event.inkSeq,
              }
            : {
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
                base: event.base,
              },
          eventId,
        );
        if (event.type === 'laser' || event.type === 'ink') pendingLive = chunk;
        else {
          pendingBoard = chunk;
          pendingLive = null;
        }
        flush();
      });
      heartbeat = setInterval(() => {
        if (pendingBoard == null && pendingLive == null) pendingLive = frame({ type: 'ping' }, 'p');
        flush();
      }, 5000);
    },
    pull() {
      flush();
    },
    cancel() {
      cleanup();
    },
  }, { highWaterMark: 32 });

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
