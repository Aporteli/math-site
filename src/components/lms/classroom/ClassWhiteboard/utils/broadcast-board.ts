import type { MutableRefObject } from 'react';
import type { Room } from 'livekit-client';
import {
  beginWhiteboardFullSync,
  fullSyncKind,
  identitiesForStudent,
  type BoardAssignmentMap,
} from '@/lib/livekit/board-assignment';
import { isStaffParticipant } from '@/lib/livekit/participant-identity';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import type { PublishDataSafe } from '../hooks/usePublishDataSafe';
import { enqueueFreshFullSync } from './enqueue-fresh-sync';

interface BroadcastArgs {
  isTeacher: boolean;
  room: Room | null;
  assignedPageByStudent: BoardAssignmentMap;
  publishDataSafe: PublishDataSafe;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  noteSnapshotSent: (pages: CanvasElement[][], assignedPageIndex?: number | null) => void;
}

export function createBoardBroadcast({
  isTeacher,
  room,
  assignedPageByStudent,
  publishDataSafe,
  pagesRef,
  currentPageIndexRef,
  noteSnapshotSent,
}: BroadcastArgs): () => Promise<boolean> {
  return async () => {
    if (!isTeacher || !room) return false;
    const jobs: Promise<boolean>[] = [];
    const sent = new Set<string>();
    for (const [studentId, pageIndex] of Object.entries(assignedPageByStudent)) {
      const dest = identitiesForStudent(room, studentId);
      if (dest.length === 0) continue;
      dest.forEach((identity) => sent.add(identity));
      const assignedClaim = beginWhiteboardFullSync(dest, fullSyncKind(pageIndex));
      if (assignedClaim) {
        jobs.push(
          enqueueFreshFullSync(
            publishDataSafe,
            pagesRef,
            currentPageIndexRef,
            assignedClaim.identities,
            pageIndex,
            noteSnapshotSent,
          )
            .finally(assignedClaim.release)
            .then((result) => result.ok),
        );
      }
    }
    const rest = [...room.remoteParticipants.values()]
      .filter((participant) => !isStaffParticipant(participant) && !sent.has(participant.identity))
      .map((participant) => participant.identity);
    if (Object.keys(assignedPageByStudent).length === 0) {
      const everyone = [...room.remoteParticipants.values()].map((participant) => participant.identity);
      const claim = beginWhiteboardFullSync(everyone, fullSyncKind(null));
      if (claim?.identities && claim.identities.length > 0) {
        jobs.push(
          enqueueFreshFullSync(publishDataSafe, pagesRef, currentPageIndexRef, claim.identities, null, noteSnapshotSent)
            .finally(claim.release)
            .then((result) => result.ok),
        );
      }
    } else if (rest.length > 0) {
      const claim = beginWhiteboardFullSync(rest, fullSyncKind(null));
      if (claim) {
        jobs.push(
          enqueueFreshFullSync(publishDataSafe, pagesRef, currentPageIndexRef, claim.identities, null, noteSnapshotSent)
            .finally(claim.release)
            .then((result) => result.ok),
        );
      }
    }
    if (jobs.length === 0) return true;
    const results = await Promise.all(jobs);
    return results.every(Boolean);
  };
}
