import type { Room } from 'livekit-client';

export interface WhiteboardNote {
  kind: 'sent' | 'received' | 'send_error' | 'receive_error' | 'skipped';
  type: string;
  at: number;
  durationMs?: number;
  message?: string;
  messageId?: string;
  sequence?: number;
}

export interface WhiteboardCounts {
  sent: number;
  received: number;
  pointerSent: number;
  pointerReceived: number;
  sendErrors: number;
  receiveErrors: number;
  skipped: number;
  maxPublishMs: number | null;
  lastSendError: string | null;
  lastReceiveError: string | null;
}

const roomHolds = new Map<Room, number>();
const listeners = new Set<(note: WhiteboardNote) => void>();

function emptyCounts(): WhiteboardCounts {
  return {
    sent: 0,
    received: 0,
    pointerSent: 0,
    pointerReceived: 0,
    sendErrors: 0,
    receiveErrors: 0,
    skipped: 0,
    maxPublishMs: null,
    lastSendError: null,
    lastReceiveError: null,
  };
}

let counts = emptyCounts();

function clip(value: string | undefined): string | null {
  const trimmed = value?.replace(/[\u0000-\u001F\u007F]/g, '').trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, 240);
}

export function whiteboardPayloadType(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || !('type' in payload)) return 'unknown';
  const type = (payload as { type?: unknown }).type;
  if (typeof type !== 'string') return 'unknown';
  const trimmed = type.trim();
  return trimmed ? trimmed.slice(0, 40) : 'unknown';
}

export function retainWhiteboardRoom(room: Room | null): () => void {
  if (!room) return () => {};
  roomHolds.set(room, (roomHolds.get(room) ?? 0) + 1);
  return () => {
    const next = (roomHolds.get(room) ?? 1) - 1;
    if (next <= 0) roomHolds.delete(room);
    else roomHolds.set(room, next);
  };
}

export function whiteboardRooms(): Room[] {
  return [...roomHolds.keys()];
}

export function subscribeWhiteboard(listener: (note: WhiteboardNote) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function noteWhiteboard(note: WhiteboardNote): void {
  try {
    const pointer = note.type === 'WHITEBOARD_LASER';
    const quiet = note.type === 'WHITEBOARD_ACK';
    if (note.kind === 'sent') {
      if (!quiet && pointer) counts.pointerSent += 1;
      else if (!quiet) counts.sent += 1;
      if (!quiet && typeof note.durationMs === 'number' && Number.isFinite(note.durationMs) && note.durationMs >= 0) {
        counts.maxPublishMs = Math.max(counts.maxPublishMs ?? 0, note.durationMs);
      }
    } else if (note.kind === 'received') {
      if (quiet) {
        // Acknowledgements are tracked on the message trace, not as board receives.
      } else if (pointer) counts.pointerReceived += 1;
      else counts.received += 1;
    } else if (note.kind === 'send_error') {
      counts.sendErrors += 1;
      counts.lastSendError = clip(note.message);
    } else if (note.kind === 'receive_error') {
      counts.receiveErrors += 1;
      counts.lastReceiveError = clip(note.message);
    } else {
      counts.skipped += 1;
    }
    for (const listener of listeners) {
      try {
        listener(note);
      } catch {
        // A diagnostics listener must not stop whiteboard delivery.
      }
    }
  } catch {
    // Diagnostics must not change whiteboard delivery.
  }
}

export function takeWhiteboardCounts(): WhiteboardCounts {
  const snapshot = counts;
  counts = emptyCounts();
  return snapshot;
}

export function restoreWhiteboardCounts(snapshot: WhiteboardCounts): void {
  counts = {
    sent: counts.sent + snapshot.sent,
    received: counts.received + snapshot.received,
    pointerSent: counts.pointerSent + snapshot.pointerSent,
    pointerReceived: counts.pointerReceived + snapshot.pointerReceived,
    sendErrors: counts.sendErrors + snapshot.sendErrors,
    receiveErrors: counts.receiveErrors + snapshot.receiveErrors,
    skipped: counts.skipped + snapshot.skipped,
    maxPublishMs:
      snapshot.maxPublishMs === null
        ? counts.maxPublishMs
        : Math.max(counts.maxPublishMs ?? 0, snapshot.maxPublishMs),
    lastSendError: counts.lastSendError ?? snapshot.lastSendError,
    lastReceiveError: counts.lastReceiveError ?? snapshot.lastReceiveError,
  };
}
