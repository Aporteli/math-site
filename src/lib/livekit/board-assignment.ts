import type { Room } from 'livekit-client';
import {
  isStaffParticipant,
  liveIdentitiesFor,
  participantUserId,
} from '@/lib/livekit/participant-identity';

/** pageIndex → student account ids that should see only that board. */
export type BoardAssignmentMap = Record<string, number>;

export function maskPagesForAssignment<T>(pages: T[][], pageIndex: number): T[][] {
  return pages.map((page, index) => (index === pageIndex ? page : []));
}

export function assignedFullSyncPayload<T>(pages: T[][], pageIndex: number) {
  const safeIndex = Math.min(Math.max(0, pageIndex), Math.max(0, pages.length - 1));
  return {
    type: 'WHITEBOARD_FULL_SYNC' as const,
    pages: maskPagesForAssignment(pages, safeIndex),
    currentPageIndex: safeIndex,
    assignedPageIndex: safeIndex,
  };
}

export function sharedFullSyncPayload<T>(pages: T[][], currentPageIndex: number) {
  return {
    type: 'WHITEBOARD_FULL_SYNC' as const,
    pages,
    currentPageIndex,
    assignedPageIndex: null as number | null,
  };
}

/** Identities in this room that should receive an update for `pageIndex`. */
export function destinationsForPage(
  room: Room | null,
  assignedPageByStudent: BoardAssignmentMap,
  pageIndex: number,
): string[] | undefined {
  if (!room) return undefined;
  const assignedEntries = Object.entries(assignedPageByStudent);
  if (assignedEntries.length === 0) return undefined;

  const destinations: string[] = [];
  for (const participant of room.remoteParticipants.values()) {
    if (isStaffParticipant(participant)) continue;
    const userId = participantUserId(participant);
    const assigned = assignedPageByStudent[userId];
    if (assigned === pageIndex || assigned === undefined) {
      destinations.push(participant.identity);
    }
  }
  return destinations;
}

export function identitiesForStudent(room: Room | null, userId: string): string[] {
  if (!room) return [];
  return liveIdentitiesFor(room.remoteParticipants.values(), userId);
}
