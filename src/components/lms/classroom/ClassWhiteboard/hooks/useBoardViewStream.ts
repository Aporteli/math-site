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

/**
 * Streams the teacher's current board view (pan/zoom/page) to locked students
 * over the lossy LiveKit data channel, targeting only locked participants so
 * the server and other clients never process unnecessary traffic.
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
    let raf = 0;
    let lastSent = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - lastSent < VIEW_STREAM_INTERVAL_MS) return;
      lastSent = now;

      const view = viewRef.current;
      // Locked ids are account ids; stream to every live device of those students.
      const destinations = ids.flatMap((id) =>
        liveIdentitiesFor(room.remoteParticipants.values(), id),
      );
      if (destinations.length === 0) return;

      void publishDataSafe({ type: 'BOARD_VIEW', view }, false, destinations);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isTeacher, room, lockedStudentIds, assignedPageByStudent, currentPageIndex, publishDataSafe]);
}
