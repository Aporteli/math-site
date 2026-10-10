'use client';

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Room } from 'livekit-client';
import type { BoardAssignmentMap } from '@/lib/livekit/board-assignment';
import { isStaffParticipant } from '@/lib/livekit/participant-identity';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import { createBoardBroadcast } from '../utils/broadcast-board';
import type { PublishDataSafe } from './usePublishDataSafe';

interface Options {
  isTeacher: boolean;
  room: Room | null;
  publishDataSafe: PublishDataSafe;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  noteSnapshotSent: (pages: CanvasElement[][], assignedPageIndex?: number | null) => void;
  publishFullSync: () => void;
  assignedPageByStudent: BoardAssignmentMap;
  pagesLength: number;
  setPageCount: (count: number) => void;
  broadcastImplRef: { current: () => Promise<boolean> };
  clearBoardAssignments: () => void;
  breakoutActive: boolean;
  assignedPageIndex: number | null;
  currentPageIndex: number;
  setCurrentPageIndex: Dispatch<SetStateAction<number>>;
}

export function useBoardBroadcast({
  isTeacher,
  room,
  publishDataSafe,
  pagesRef,
  currentPageIndexRef,
  noteSnapshotSent,
  publishFullSync,
  assignedPageByStudent,
  pagesLength,
  setPageCount,
  broadcastImplRef,
  clearBoardAssignments,
  breakoutActive,
  assignedPageIndex,
  currentPageIndex,
  setCurrentPageIndex,
}: Options) {
  // Refresh the closure every render so the broadcast effect sends the latest pages.
  /* eslint-disable react-hooks/refs -- assigned during render, same as before this split */
  broadcastImplRef.current = createBoardBroadcast({
    isTeacher,
    room,
    assignedPageByStudent,
    publishDataSafe,
    pagesRef,
    currentPageIndexRef,
    noteSnapshotSent,
  });
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (isTeacher) setPageCount(pagesLength);
  }, [isTeacher, pagesLength, setPageCount]);

  const assignedSnapshot = JSON.stringify(assignedPageByStudent);
  const didBroadcastRef = useRef(false);
  useEffect(() => {
    if (!isTeacher) return;
    // The first broadcast runs on mount, often before the saved board has
    // loaded. A second teacher device must not push that empty snapshot over
    // the live board already being shown to the class.
    if (!didBroadcastRef.current) {
      didBroadcastRef.current = true;
      const otherStaffPresent =
        !!room && [...room.remoteParticipants.values()].some((participant) => isStaffParticipant(participant));
      if (otherStaffPresent) return;
    }
    void broadcastImplRef.current().then((ok) => {
      if (!ok) publishFullSync();
    });
  }, [assignedSnapshot, broadcastImplRef, isTeacher, publishFullSync, room]);

  const breakoutWasActive = useRef(breakoutActive);
  useEffect(() => {
    if (!isTeacher) return;
    if (breakoutWasActive.current && !breakoutActive) {
      clearBoardAssignments();
    }
    breakoutWasActive.current = breakoutActive;
  }, [breakoutActive, clearBoardAssignments, isTeacher]);

  useEffect(() => {
    if (isTeacher || assignedPageIndex === null) return;
    if (currentPageIndex !== assignedPageIndex) {
      setCurrentPageIndex(assignedPageIndex);
      currentPageIndexRef.current = assignedPageIndex;
    }
  }, [assignedPageIndex, currentPageIndex, isTeacher, setCurrentPageIndex, currentPageIndexRef]);
}
