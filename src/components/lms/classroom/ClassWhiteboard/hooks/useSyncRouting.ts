'use client';

import { useCallback, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import { destinationsForPage, type BoardAssignmentMap } from '@/lib/livekit/board-assignment';

export function useSyncRouting(room: Room | null, assignedPageByStudent: BoardAssignmentMap) {
  const [assignedPageIndex, setAssignedPageIndex] = useState<number | null>(null);

  const getSyncDestinations = useCallback(
    (pageIndex: number) => destinationsForPage(room, assignedPageByStudent, pageIndex),
    [room, assignedPageByStudent],
  );

  const broadcastImplRef = useRef<() => Promise<boolean>>(async () => false);
  const broadcastBoard = useCallback(() => broadcastImplRef.current(), []);

  return {
    assignedPageIndex,
    setAssignedPageIndex,
    getSyncDestinations,
    broadcastImplRef,
    broadcastBoard,
  };
}
