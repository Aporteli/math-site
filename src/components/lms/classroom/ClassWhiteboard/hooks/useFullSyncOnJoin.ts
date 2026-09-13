'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
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
  // Keep the publisher in a ref so the effect can depend only on `room`.
  // An unmemoized publishDataSafe would re-subscribe on every render and
  // can race its own listener cleanup.
  const publishRef = useRef(publishDataSafe);
  publishRef.current = publishDataSafe;

  useEffect(() => {
    if (!isTeacher || !room) return;

    const sendFullSync = () => {
      void publishRef.current(
        {
          type: 'WHITEBOARD_FULL_SYNC',
          pages: pagesRef.current,
          currentPageIndex: currentPageIndexRef.current,
        },
        true,
      );
    };

    // Best-effort push when a new participant joins. This alone is racy:
    // the joiner's own DataReceived listener may not be attached yet, and
    // LiveKit does not buffer data packets for late listeners. The reliable
    // request/response path lives in useWhiteboardDataChannel, where the
    // WHITEBOARD_REQUEST_SYNC message is reassembled through the shared
    // ChunkAssembler before being answered. A raw JSON.parse here would
    // reject the chunked request packets and silently drop them, so we do
    // not register a second DataReceived listener.
    const handleParticipantConnected = () => {
      sendFullSync();
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    // If a participant is already in the room when this hook attaches
    // (teacher reconnected while students stayed connected), send once.
    sendFullSync();

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [isTeacher, room, pagesRef, currentPageIndexRef]);
}