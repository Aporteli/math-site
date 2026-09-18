//CUT

'use client';

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { Room } from 'livekit-client';
import { ConnectionState, RoomEvent } from 'livekit-client';
import type { CanvasElement, KonvaCanvasHandle } from '../../KonvaCanvas/utils/types';
import { ChunkAssembler } from '../utils/chunk';
import { adaptElementsForTheme } from '../utils/theme';
import type { BoardView, HistoryMap } from '../utils/types';

const TRACK_STUDENT_HISTORY = false;

/** Delay before re-requesting a full snapshot when the first request is unanswered. */
const SYNC_RETRY_DELAY_MS = 2000;

/** Minimum gap between immediate `WHITEBOARD_REQUEST_SYNC` sends. */
const SYNC_REQUEST_THROTTLE_MS = 500;

interface Options {
  room: Room | null;
  isTeacher: boolean;
  publishDataSafe?: (payload: any, reliable?: boolean) => Promise<void>;
  isDark: boolean;
  updateUndoRedoState: () => void;
  canvasRef: RefObject<KonvaCanvasHandle | null>;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  historyMapRef: MutableRefObject<HistoryMap>;
  isRemoteUpdateRef: MutableRefObject<boolean>;
  hasAppliedLiveSyncRef?: MutableRefObject<boolean>;
  chunkAssemblerRef: MutableRefObject<ChunkAssembler>;
  setPages: (pages: CanvasElement[][]) => void;
  setCurrentPageIndex: (idx: number) => void;
  setIsLocked: (locked: boolean) => void;
  applyBoardView: (view: BoardView) => void;
}

export function useWhiteboardDataChannel(opts: Options) {
  const {
    room,
    isTeacher,
    publishDataSafe,
    isDark,
    updateUndoRedoState,
    canvasRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    isRemoteUpdateRef,
    hasAppliedLiveSyncRef,
    chunkAssemblerRef,
    setPages,
    setCurrentPageIndex,
    setIsLocked,
    applyBoardView,
  } = opts;

  const publishRef = useRef<Options['publishDataSafe']>(publishDataSafe);
  publishRef.current = publishDataSafe;

  // The Room instance for which we have already applied a full snapshot.
  // Comparing the instance (not a boolean) keeps the flag correct across
  // reconnects/remounts without needing to reset it on every render.
  const fullSyncReceivedRef = useRef<Room | null>(null);
  const syncRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestTimeRef = useRef(0);

  // Send the request only when we know the room is connected — otherwise
  // usePublishDataSafe silently drops it (see its ConnectionState guard).
  const sendSyncRequest = useCallback(() => {
    if (isTeacher || !room) return;
    if (fullSyncReceivedRef.current === room) return;
    if (room.state !== ConnectionState.Connected) return;

    const publish = publishRef.current;
    if (typeof publish !== 'function') return;

    const now = Date.now();
    if (now - lastRequestTimeRef.current >= SYNC_REQUEST_THROTTLE_MS) {
      lastRequestTimeRef.current = now;
      void publish({ type: 'WHITEBOARD_REQUEST_SYNC' }, true);
    }

    // A single request can be lost if it fires before the teacher's data
    // channel is ready to answer. Retry once shortly after if we still
    // haven't received a full snapshot.
    if (syncRetryTimerRef.current) clearTimeout(syncRetryTimerRef.current);
    syncRetryTimerRef.current = setTimeout(() => {
      syncRetryTimerRef.current = null;
      if (fullSyncReceivedRef.current === room) return;
      if (room.state !== ConnectionState.Connected) return;
      const retryPublish = publishRef.current;
      if (typeof retryPublish === 'function') {
        lastRequestTimeRef.current = Date.now();
        void retryPublish({ type: 'WHITEBOARD_REQUEST_SYNC' }, true);
      }
    }, SYNC_RETRY_DELAY_MS);
  }, [isTeacher, room]);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const fullPayload = chunkAssemblerRef.current.push(payload);
        if (!fullPayload) return;

        const data = JSON.parse(new TextDecoder().decode(fullPayload));

        if (data.type === 'BOARD_CONTROL') {
          setIsLocked(!!data.enabled);
          return;
        }

        if (data.type === 'BOARD_VIEW' && data.view) {
          applyBoardView(data.view as BoardView);
          return;
        }

        if (data.type === 'WHITEBOARD_REQUEST_SYNC' && isTeacher) {
          const publish = publishRef.current;
          if (typeof publish === 'function') {
            void publish(
              {
                type: 'WHITEBOARD_FULL_SYNC',
                pages: pagesRef.current,
                currentPageIndex: currentPageIndexRef.current,
              },
              true,
            );
          }
          return;
        }

        if (data.type === 'WHITEBOARD_FULL_SYNC') {
          if (Array.isArray(data.pages)) {
            fullSyncReceivedRef.current = room;
            if (hasAppliedLiveSyncRef) hasAppliedLiveSyncRef.current = true;
            if (syncRetryTimerRef.current) {
              clearTimeout(syncRetryTimerRef.current);
              syncRetryTimerRef.current = null;
            }

            const newPages = (data.pages as CanvasElement[][]).map((page) => adaptElementsForTheme(page || [], isDark));
            const rawIndex = data.currentPageIndex ?? 0;
            const newPageIndex = Math.min(Math.max(0, rawIndex), Math.max(0, newPages.length - 1));
            historyMapRef.current = new Map();
            newPages.forEach((p, idx) => {
              historyMapRef.current.set(idx, { states: [p || []], index: 0 });
            });
            setPages(newPages);
            pagesRef.current = newPages;
            setCurrentPageIndex(newPageIndex);
            currentPageIndexRef.current = newPageIndex;
            updateUndoRedoState();
          }
          return;
        }

        if (data.type === 'WHITEBOARD_PAGE_INDEX') {
          if (typeof data.pageIndex === 'number') {
            setCurrentPageIndex(data.pageIndex);
            currentPageIndexRef.current = data.pageIndex;
          }
          return;
        }

        if (data.type === 'WHITEBOARD_SYNC' && Array.isArray(data.elements)) {
          if (isTeacher) return;
          const pageIndex = typeof data.pageIndex === 'number' ? data.pageIndex : 0;
          isRemoteUpdateRef.current = true;
          if (hasAppliedLiveSyncRef) hasAppliedLiveSyncRef.current = true;
          const adaptedElements = adaptElementsForTheme(data.elements, isDark);
          const updated = [...pagesRef.current];
          while (updated.length <= pageIndex) updated.push([]);
          updated[pageIndex] = adaptedElements;
          setPages(updated);
          pagesRef.current = updated;

          // სტუდენტის ისტორია დროებით გამორთულია — მეხსიერების ოპტიმიზაცია.
          // ჩართე, თუ სტუდენტსაც მისცემ undo-ს.
          if (TRACK_STUDENT_HISTORY) {
            const pHist = historyMapRef.current.get(pageIndex) || { states: [], index: -1 };
            pHist.states.push(adaptedElements);
            pHist.index = pHist.states.length - 1;
            historyMapRef.current.set(pageIndex, pHist);
            updateUndoRedoState();
          }

          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 30);
        } else if (data.type === 'WHITEBOARD_PAGE_COUNT') {
          if (typeof data.count === 'number') {
            const newPages = [...pagesRef.current];
            while (newPages.length < data.count) newPages.push([]);
            setPages(newPages);
            pagesRef.current = newPages;
          }
        } else if (data.type === 'WHITEBOARD_LASER') {
          if (data.pageIndex === undefined || data.pageIndex === currentPageIndexRef.current) {
            canvasRef.current?.renderRemoteLaser(data.point);
          }
        }
      } catch (err) {
        console.error('Packet reassembly error:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);

    // Retry the request once the room actually connects. Without this, the
    // request is attempted during `Connecting` state, dropped by
    // usePublishDataSafe's ConnectionState guard, and never re-tried.
    room.on(RoomEvent.Connected, sendSyncRequest);
    room.on(RoomEvent.Reconnected, sendSyncRequest);

    // If a student connects before the teacher is ready to answer, re-request
    // as soon as a participant appears (e.g. the teacher joins after us).
    room.on(RoomEvent.ParticipantConnected, sendSyncRequest);

    // Also try immediately — the room may already be connected when this
    // effect runs (e.g. hot reload, remount while connected).
    sendSyncRequest();

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.Connected, sendSyncRequest);
      room.off(RoomEvent.Reconnected, sendSyncRequest);
      room.off(RoomEvent.ParticipantConnected, sendSyncRequest);
      if (syncRetryTimerRef.current) {
        clearTimeout(syncRetryTimerRef.current);
        syncRetryTimerRef.current = null;
      }
    };
  }, [
    room,
    isTeacher,
    isDark,
    updateUndoRedoState,
    canvasRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    isRemoteUpdateRef,
    chunkAssemblerRef,
    setPages,
    setCurrentPageIndex,
    setIsLocked,
    applyBoardView,
    sendSyncRequest,
  ]);
}
