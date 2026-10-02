'use client';

import { useEffect, useRef } from 'react';
import type { Room } from 'livekit-client';
import { liveIdentitiesFor } from '@/lib/livekit/participant-identity';

interface Options {
  room: Room | null;
  isTeacher: boolean;
  lockedStudentIds: Set<string>;
  assignedPageByStudent: Record<string, number>;
  publishDataSafe: (payload: any, reliable?: boolean, destinationIdentities?: string[]) => Promise<void>;
  zoomScale: number;
  stagePos: { x: number; y: number };
  currentPageIndex: number;
}

/** View-stream throttle (ms). Low enough to feel real-time, high enough to avoid flooding the data channel. */
const VIEW_STREAM_INTERVAL_MS = 40;

interface BoardViewSnapshot {
  scale: number;
  x: number;
  y: number;
  pageIndex: number;
}

function viewChanged(previous: BoardViewSnapshot, next: BoardViewSnapshot): boolean {
  return (
    previous.pageIndex !== next.pageIndex ||
    Math.abs(previous.scale - next.scale) > 0.001 ||
    Math.abs(previous.x - next.x) > 0.5 ||
    Math.abs(previous.y - next.y) > 0.5
  );
}

/**
 * Streams the teacher's pan/zoom to locked students only.
 */
export function useBoardViewStream({
  room,
  isTeacher,
  lockedStudentIds,
  assignedPageByStudent,
  publishDataSafe,
  zoomScale,
  stagePos,
  currentPageIndex,
}: Options) {
  const viewRef = useRef({ scale: zoomScale, x: stagePos.x, y: stagePos.y, pageIndex: currentPageIndex });
  viewRef.current = { scale: zoomScale, x: stagePos.x, y: stagePos.y, pageIndex: currentPageIndex };

  useEffect(() => {
    if (!isTeacher || !room || lockedStudentIds.size === 0) return;

    const ids = Array.from(lockedStudentIds).filter((id) => {
      const assigned = assignedPageByStudent[id];
      return assigned === undefined || assigned === currentPageIndex;
    });
    if (ids.length === 0) return;

    let lastSentView: BoardViewSnapshot | null = null;

    const send = () => {
      const view = viewRef.current;
      if (lastSentView && !viewChanged(lastSentView, view)) return;

      const destinations = ids.flatMap((id) =>
        liveIdentitiesFor(room.remoteParticipants.values(), id),
      );
      if (destinations.length === 0) return;

      lastSentView = { ...view };
      void publishDataSafe({ type: 'BOARD_VIEW', view }, false, destinations);
    };

    send();
    const timer = window.setInterval(send, VIEW_STREAM_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isTeacher, room, lockedStudentIds, assignedPageByStudent, currentPageIndex, publishDataSafe]);
}
