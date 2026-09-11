'use client';

import { useEffect, type MutableRefObject } from 'react';
import type { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';

export function useFullSyncOnJoin(
  isTeacher: boolean,
  room: Room | null,
  publishDataSafe: (payload: any, reliable?: boolean) => Promise<void>,
  pagesRef: MutableRefObject<CanvasElement[][]>,
  currentPageIndexRef: MutableRefObject<number>,
) {
  useEffect(() => {
    if (!isTeacher || !room) return;

    const handleParticipantConnected = () => {
      void publishDataSafe(
        {
          type: 'WHITEBOARD_FULL_SYNC',
          pages: pagesRef.current,
          currentPageIndex: currentPageIndexRef.current,
        },
        true,
      );
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [isTeacher, room, publishDataSafe, pagesRef, currentPageIndexRef]);
}