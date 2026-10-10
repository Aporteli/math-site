import type { WhiteboardNote } from '@/lib/livekit/diagnostics/whiteboard-trace';
import type { DiagnosticsSession } from './session';

export function createWhiteboardHandler(session: DiagnosticsSession): (note: WhiteboardNote) => void {
  return (note: WhiteboardNote) => {
    if (note.kind !== 'send_error' && note.kind !== 'receive_error' && note.kind !== 'skipped') return;
    const nowMs = Date.now();
    if (nowMs - (session.whiteboardEventAt.get(note.kind) ?? 0) < 15_000) return;
    session.whiteboardEventAt.set(note.kind, nowMs);
    const correlation = {
      ...(note.messageId ? { messageId: note.messageId } : {}),
      ...(typeof note.sequence === 'number' ? { sequence: note.sequence } : {}),
    };
    if (note.kind === 'send_error') {
      session.push('whiteboard_send_failed', {
        message: note.message ?? 'Whiteboard publish failed',
        whiteboardType: note.type,
        ...correlation,
      });
    } else if (note.kind === 'receive_error') {
      session.push('whiteboard_receive_failed', {
        message: note.message ?? 'Whiteboard message could not be read',
        whiteboardType: note.type,
        ...correlation,
      });
    } else {
      session.push('whiteboard_send_skipped', {
        message: note.message ?? 'Whiteboard publish skipped because the room was not connected',
        whiteboardType: note.type,
        ...correlation,
      });
    }
    session.requestFlush();
  };
}
