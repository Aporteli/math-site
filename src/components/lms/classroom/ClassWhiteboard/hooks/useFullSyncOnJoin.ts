'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import type { RemoteParticipant } from 'livekit-client';
import { isStaffParticipant, participantUserId } from '@/lib/livekit/participant-identity';
import {
  assignedFullSyncPayload,
  beginWhiteboardFullSync,
  fullSyncKind,
  sharedFullSyncPayload,
  identitiesForStudent,
  type BoardAssignmentMap,
} from '@/lib/livekit/board-assignment';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';

export function useFullSyncOnJoin(
  isTeacher: boolean,
  room: Room | null,
  publishDataSafe: (payload: object, reliable?: boolean, destinationIdentities?: string[]) => Promise<void>,
  pagesRef: MutableRefObject<CanvasElement[][]>,
  currentPageIndexRef: MutableRefObject<number>,
  assignedPageByStudent: BoardAssignmentMap,
) {
  const publishRef = useRef(publishDataSafe);
  publishRef.current = publishDataSafe;
  const assignedRef = useRef(assignedPageByStudent);
  assignedRef.current = assignedPageByStudent;

  useEffect(() => {
    if (!isTeacher || !room) return;

    const sendLiveBoardToStaff = (participant: RemoteParticipant) => {
      const board = pagesRef.current;
      const pristine = board.length <= 1 && (board[0]?.length ?? 0) === 0;
      if (pristine) return;
      const claim = beginWhiteboardFullSync([participant.identity], fullSyncKind(null));
      if (!claim) return;
      void publishRef.current(
        sharedFullSyncPayload(board, currentPageIndexRef.current),
        true,
        claim.identities,
      ).finally(claim.release);
    };

    const sendToParticipant = (participant: RemoteParticipant) => {
      if (isStaffParticipant(participant)) return;
      const userId = participantUserId(participant);
      const assigned = assignedRef.current[userId];
      const dest = identitiesForStudent(room, userId);
      if (dest.length === 0) return;
      const payload =
        typeof assigned === 'number'
          ? assignedFullSyncPayload(pagesRef.current, assigned)
          : sharedFullSyncPayload(pagesRef.current, currentPageIndexRef.current);
      const claim = beginWhiteboardFullSync(dest, fullSyncKind(assigned));
      if (!claim) return;
      void publishRef.current(payload, true, claim.identities).finally(claim.release);
    };

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      // A second teacher device joins an existing session. Push the live board
      // to that device only — do not let its own (often empty) snapshot fan
      // back out to students from the mount-time sync below.
      if (isStaffParticipant(participant)) {
        sendLiveBoardToStaff(participant);
        return;
      }
      sendToParticipant(participant);
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    for (const participant of room.remoteParticipants.values()) {
      sendToParticipant(participant);
    }

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [isTeacher, room, pagesRef, currentPageIndexRef]);
}
