import { getSession } from '@/lib/auth/session';
import { subscribeTeacherBoard } from '@/lib/teacher-board/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* closed */
        }
      };
      send(': ok\n\n');
      unsubscribe = subscribeTeacherBoard(userId, (event) => {
        send(
          `data: ${JSON.stringify({
            revision: event.revision,
            clientId: event.clientId,
            pages: event.pages,
            currentPageIndex: event.currentPageIndex,
            type: event.type,
            point: event.point,
            pageIndex: event.pageIndex,
          })}\n\n`,
        );
      });
      heartbeat = setInterval(() => send(': ping\n\n'), 15000);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
