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
    // Another device of the same teacher must see the board too. Students are
    // filtered by assignment; staff always receive the page being drawn.
    if (isStaffParticipant(participant)) {
      destinations.push(participant.identity);
      continue;
    }
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

const FULL_SYNC_ALL = '*';
const fullSyncInFlight = new Set<string>();
let fullSyncEpoch = 0;

export function fullSyncKind(assignedPageIndex: number | null | undefined): string {
  return typeof assignedPageIndex === 'number' ? `assigned:${assignedPageIndex}` : 'shared';
}

/** Page structure changed, so a newer snapshot must not be collapsed into one already uploading. */
export function invalidateWhiteboardFullSync(): void {
  fullSyncEpoch += 1;
}

export interface FullSyncClaim {
  identities: string[] | undefined;
  release: () => void;
}

/**
 * Reserves a full snapshot for destinations that are not already receiving one of the same kind.
 * Call `release` when publishing finishes. Page deletion bumps the epoch first so the new snapshot is sent.
 */
export function beginWhiteboardFullSync(identities: string[] | undefined, kind: string): FullSyncClaim | null {
  if (identities && identities.length === 0) return null;
  const epoch = String(fullSyncEpoch);
  const allKey = `${epoch}\0${kind}\0${FULL_SYNC_ALL}`;
  const everyone = identities === undefined;
  const selected = everyone ? undefined : identities.filter((identity) => !fullSyncInFlight.has(`${epoch}\0${kind}\0${identity}`));
  if (fullSyncInFlight.has(allKey)) return null;
  if (!selected || selected.length === 0) {
    if (!everyone) return null;
  }

  const keys =
    selected && selected.length > 0 ? selected.map((identity) => `${epoch}\0${kind}\0${identity}`) : [allKey];
  for (const key of keys) fullSyncInFlight.add(key);

  let released = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    if (released) return;
    released = true;
    if (timer) clearTimeout(timer);
    for (const key of keys) fullSyncInFlight.delete(key);
  };
  timer = setTimeout(release, 20_000);
  return { identities: everyone ? undefined : selected, release };
}
