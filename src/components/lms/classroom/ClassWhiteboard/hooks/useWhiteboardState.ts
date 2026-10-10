//CUT

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import { ConnectionState, RoomEvent } from 'livekit-client';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import type { HistoryMap } from '../utils/types';
import { getCourseWhiteboardAction, saveCourseWhiteboardAction } from '@/lib/actions/course-whiteboard';
import { beginWhiteboardFullSync, fullSyncKind, invalidateWhiteboardFullSync } from '@/lib/livekit/board-assignment';
import { diffPageElements } from '../utils/whiteboard-delta';
import { enqueueFreshFullSync } from '../utils/enqueue-fresh-sync';
import type { PublishDataSafe } from './usePublishDataSafe';

interface Options {
  courseId: string;
  isTeacher: boolean;
  /** Student was granted pen, eraser, and stylus by the teacher. */
  canDraw?: boolean;
  isDark: boolean;
  room: Room | null;
  publishDataSafe: PublishDataSafe;
  getSyncDestinations?: (pageIndex: number) => string[] | undefined;
  broadcastBoard?: () => Promise<boolean>;
}

const HISTORY_LIMIT = 50;

function capHistory(states: CanvasElement[][], index: number): { states: CanvasElement[][]; index: number } {
  if (states.length <= HISTORY_LIMIT) return { states, index };
  const extra = states.length - HISTORY_LIMIT;
  return { states: states.slice(extra), index: Math.max(0, index - extra) };
}

const SAVE_DEBOUNCE_MS = 1500;

export function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function fileBytesFromDataUrl(dataUrl: string): number {
  const marker = 'base64,';
  const index = dataUrl.indexOf(marker);
  if (index < 0) return new TextEncoder().encode(dataUrl).length;
  const base64 = dataUrl.slice(index + marker.length).replace(/\s/g, '');
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function logWhiteboardSave(pages: CanvasElement[][]) {
  const pagesBytes = new TextEncoder().encode(JSON.stringify(pages)).length;
  const sources: string[] = [];
  for (const page of pages) {
    for (const element of page) {
      if (element?.type === 'image' && typeof element.src === 'string' && element.src) sources.push(element.src);
    }
  }
  console.log(`[whiteboard save] pages ${megabytes(pagesBytes)}`);
  void Promise.all(
    sources.map(async (src) => {
      if (src.startsWith('data:')) return fileBytesFromDataUrl(src);
      const response = await fetch(src);
      const blob = await response.blob();
      return blob.size;
    }),
  )
    .then((sizes) => {
      const sum = sizes.reduce((total, size) => total + size, 0);
      console.log(`[whiteboard uploaded images] sum ${megabytes(sum)}`);
    })
    .catch((error: unknown) => {
      console.log('[whiteboard uploaded images] sum unavailable', error);
    });
}

export function useWhiteboardState({ courseId, isTeacher, canDraw = false, room, publishDataSafe, getSyncDestinations, broadcastBoard }: Options) {
  const isRemoteUpdateRef = useRef(false);
  // True once the initial DB read has completed (whether or not a saved board
  // existed). Prevents the teacher from overwriting a saved board with the
  // empty `[[]]` placeholder before the load finishes.
  const hasLoadedFromDbRef = useRef(false);
  // True once a live (WebRTC) snapshot has been applied. The DB load checks
  // this so a slower database read never clobbers a fresher in-room sync.
  const hasAppliedLiveSyncRef = useRef(false);
  // Latest board snapshot that has not yet been flushed to the database.
  const pendingSaveRef = useRef<{ pages: CanvasElement[][]; pageIndex: number } | null>(null);

  const [pages, setPages] = useState<CanvasElement[][]>([[]]);

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isPagesTrayOpen, setIsPagesTrayOpen] = useState<boolean>(false);

  const historyMapRef = useRef<HistoryMap>(new Map([[0, { states: [pages[0] || []], index: 0 }]]));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pagesRef = useRef<CanvasElement[][]>(pages);
  const currentPageIndexRef = useRef<number>(0);
  const lastSentRef = useRef<CanvasElement[][]>(pages.map((page) => page));
  const dirtyRef = useRef(false);
  const fullSyncPendingRef = useRef(false);
  const flushingRef = useRef(false);
  const publishRef = useRef(publishDataSafe);
  publishRef.current = publishDataSafe;
  const getSyncDestinationsRef = useRef(getSyncDestinations);
  getSyncDestinationsRef.current = getSyncDestinations;
  const broadcastRef = useRef(broadcastBoard);
  broadcastRef.current = broadcastBoard;
  const roomRef = useRef(room);
  roomRef.current = room;
  const isTeacherRef = useRef(isTeacher);
  isTeacherRef.current = isTeacher;
  const canEditRef = useRef(isTeacher || canDraw);
  canEditRef.current = isTeacher || canDraw;

  const updateUndoRedoState = useCallback(() => {
    const pageHist = historyMapRef.current.get(currentPageIndexRef.current);
    if (pageHist) {
      setCanUndo(pageHist.index > 0);
      setCanRedo(pageHist.index < pageHist.states.length - 1);
    } else {
      setCanUndo(false);
      setCanRedo(false);
    }
  }, []);

  // Load the saved board from the database. The teacher restores their last
  // lesson; students see the last saved snapshot until the live sync arrives.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getCourseWhiteboardAction(courseId);
        if (cancelled) return;

        if (data && Array.isArray(data.pages) && data.pages.length > 0 && !hasAppliedLiveSyncRef.current) {
          // If the user already made local edits before the database answered
          // (extremely fast draw on a slow connection), keep those edits.
          const isPristine = pagesRef.current.length === 1 && (pagesRef.current[0]?.length ?? 0) === 0;

          if (isPristine) {
            const loadedPages = data.pages as CanvasElement[][];
            const loadedIndex = typeof data.currentPageIndex === 'number' ? data.currentPageIndex : 0;

            setPages(loadedPages);
            pagesRef.current = loadedPages;
            lastSentRef.current = loadedPages.map((page) => page);
            setCurrentPageIndex(loadedIndex);
            currentPageIndexRef.current = loadedIndex;

            historyMapRef.current = new Map(loadedPages.map((page, idx) => [idx, { states: [page || []], index: 0 }]));
            updateUndoRedoState();
          }
        }
      } finally {
        // Always allow saving after the initial read attempt, even if it failed.
        if (!cancelled) hasLoadedFromDbRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, updateUndoRedoState]);

  // Sync refs
  useEffect(() => {
    pagesRef.current = pages;
    currentPageIndexRef.current = currentPageIndex;
    updateUndoRedoState();
  }, [pages, currentPageIndex, updateUndoRedoState]);

  // Persist the teacher's board to the database (debounced). The latest
  // snapshot is kept in `pendingSaveRef` so it can be flushed on unmount.
  useEffect(() => {
    if (!isTeacher) return;
    if (!hasLoadedFromDbRef.current) return;

    pendingSaveRef.current = { pages, pageIndex: currentPageIndex };

    const t = setTimeout(() => {
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (pending) {
        logWhiteboardSave(pending.pages);
        void saveCourseWhiteboardAction(courseId, pending.pages, pending.pageIndex);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [pages, currentPageIndex, isTeacher, courseId]);

  // Flush the latest pending snapshot when the teacher leaves the room, so a
  // debounced save is never lost when the component unmounts.
  useEffect(() => {
    return () => {
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (isTeacher && pending) {
        logWhiteboardSave(pending.pages);
        void saveCourseWhiteboardAction(courseId, pending.pages, pending.pageIndex);
      }
    };
  }, [isTeacher, courseId]);

  // A student who just received drawing tools undoes back to the board they
  // currently see, not to an older local snapshot.
  useEffect(() => {
    if (isTeacher || !canDraw) return;
    const pageIndex = currentPageIndexRef.current;
    const page = pagesRef.current[pageIndex] ?? [];
    historyMapRef.current.set(pageIndex, { states: [page], index: 0 });
    updateUndoRedoState();
  }, [canDraw, isTeacher, updateUndoRedoState]);

  const pushHistory = useCallback((pageIndex: number, elements: CanvasElement[]) => {
    let pageHist = historyMapRef.current.get(pageIndex);
    if (!pageHist) pageHist = { states: [[]], index: 0 };
    const nextStates = pageHist.states.slice(0, pageHist.index + 1);
    nextStates.push(elements);
    const capped = capHistory(nextStates, nextStates.length - 1);
    historyMapRef.current.set(pageIndex, capped);
  }, []);

  const noteSnapshotSent = useCallback((sentPages: CanvasElement[][], assignedPageIndex?: number | null) => {
    if (typeof assignedPageIndex === 'number') {
      const sent = lastSentRef.current.map((page) => page);
      while (sent.length <= assignedPageIndex) sent.push([]);
      sent[assignedPageIndex] = sentPages[assignedPageIndex] ?? [];
      lastSentRef.current = sent;
      return;
    }
    lastSentRef.current = sentPages.map((page) => page);
  }, []);

  const adoptRemotePage = useCallback((pageIndex: number, previous: readonly CanvasElement[]) => {
    const sentPage = lastSentRef.current[pageIndex];
    if (sentPage !== undefined && sentPage !== previous) return;
    const sent = lastSentRef.current.map((page) => page);
    sent[pageIndex] = pagesRef.current[pageIndex] ?? [];
    lastSentRef.current = sent;
  }, []);

  const waitUntilConnected = useCallback(async () => {
    const current = roomRef.current;
    if (!current) return;
    if (current.state === ConnectionState.Connected) return;
    await new Promise<void>((resolve) => {
      const done = () => {
        current.off(RoomEvent.Connected, done);
        current.off(RoomEvent.Reconnected, done);
        resolve();
      };
      current.on(RoomEvent.Connected, done);
      current.on(RoomEvent.Reconnected, done);
    });
  }, []);

  const flushRef = useRef<() => void>(() => {});

  const scheduleFlush = useCallback(() => {
    if (!canEditRef.current) return;
    dirtyRef.current = true;
    flushRef.current();
  }, []);

  flushRef.current = () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    void (async () => {
      try {
        while (dirtyRef.current || fullSyncPendingRef.current) {
          await publishRef.current.whenContentIdle();
          const currentRoom = roomRef.current;
          if (!currentRoom || currentRoom.state !== ConnectionState.Connected) {
            await waitUntilConnected();
            if (!roomRef.current || roomRef.current.state !== ConnectionState.Connected) break;
          }

          if (fullSyncPendingRef.current && !isTeacherRef.current) {
            fullSyncPendingRef.current = false;
          }

          if (fullSyncPendingRef.current) {
            fullSyncPendingRef.current = false;
            invalidateWhiteboardFullSync();
            const broadcast = broadcastRef.current;
            let ok = false;
            if (broadcast) {
              ok = await broadcast();
            } else {
              const claim = beginWhiteboardFullSync(undefined, fullSyncKind(null));
              if (claim) {
                const result = await enqueueFreshFullSync(
                  publishRef.current,
                  pagesRef,
                  currentPageIndexRef,
                  claim.identities,
                  null,
                  noteSnapshotSent,
                ).finally(claim.release);
                ok = result.ok;
              }
            }
            if (!ok) {
              fullSyncPendingRef.current = true;
              dirtyRef.current = true;
              await new Promise((resolve) => setTimeout(resolve, 1000));
              continue;
            }
          }

          if (!dirtyRef.current) continue;
          const snapshot = pagesRef.current.map((page) => page);
          dirtyRef.current = false;
          const base = lastSentRef.current;
          let failed = false;
          for (let pageIndex = 0; pageIndex < snapshot.length; pageIndex += 1) {
            const previous = base[pageIndex] ?? [];
            const next = snapshot[pageIndex] ?? [];
            if (previous === next) continue;
            const delta = diffPageElements(previous, next);
            if (delta.added.length === 0 && delta.updated.length === 0 && delta.deleted.length === 0) {
              const sent = lastSentRef.current.map((page) => page);
              sent[pageIndex] = next;
              lastSentRef.current = sent;
              continue;
            }
            const destinations = getSyncDestinationsRef.current?.(pageIndex);
            if (destinations && destinations.length === 0) continue;
            const result = await publishRef.current(
              {
                type: 'WHITEBOARD_DELTA',
                pageIndex,
                ...(delta.added.length > 0 ? { added: delta.added } : {}),
                ...(delta.updated.length > 0 ? { updated: delta.updated } : {}),
                ...(delta.deleted.length > 0 ? { deleted: delta.deleted } : {}),
              },
              true,
              destinations,
            );
            if (!result.ok) {
              failed = true;
              dirtyRef.current = true;
              if (result.reason === 'not_connected') await waitUntilConnected();
              else await new Promise((resolve) => setTimeout(resolve, 1000));
              break;
            }
            const sent = lastSentRef.current.map((page) => page);
            sent[pageIndex] = next;
            lastSentRef.current = sent;
          }
          if (failed) continue;
        }
      } finally {
        flushingRef.current = false;
        if (dirtyRef.current || fullSyncPendingRef.current) flushRef.current();
      }
    })();
  };

  useEffect(() => {
    if (!room) return;
    const retry = () => {
      if (dirtyRef.current || fullSyncPendingRef.current) flushRef.current();
    };
    room.on(RoomEvent.Connected, retry);
    room.on(RoomEvent.Reconnected, retry);
    return () => {
      room.off(RoomEvent.Connected, retry);
      room.off(RoomEvent.Reconnected, retry);
    };
  }, [room]);

  const handleElementsChange = useCallback(
    (newElems: CanvasElement[], options?: { commitHistory?: boolean; publish?: boolean }) => {
      if (!canEditRef.current) return;
      if (isRemoteUpdateRef.current) return;
      const pIndex = currentPageIndexRef.current;
      const updated = [...pagesRef.current];
      updated[pIndex] = newElems;
      setPages(updated);
      pagesRef.current = updated;

      if (options?.commitHistory !== false) {
        pushHistory(pIndex, newElems);
        updateUndoRedoState();
      }

      if (options?.publish !== false) scheduleFlush();
    },
    [pushHistory, scheduleFlush, updateUndoRedoState],
  );

  const handleUndo = useCallback(() => {
    if (!canEditRef.current) return;
    const pIndex = currentPageIndexRef.current;
    const pageHist = historyMapRef.current.get(pIndex);
    if (!pageHist || pageHist.index <= 0) return;

    pageHist.index -= 1;
    const targetElements = pageHist.states[pageHist.index];

    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;

    updateUndoRedoState();
    scheduleFlush();
  }, [scheduleFlush, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (!canEditRef.current) return;
    const pIndex = currentPageIndexRef.current;
    const pageHist = historyMapRef.current.get(pIndex);
    if (!pageHist || pageHist.index >= pageHist.states.length - 1) return;

    pageHist.index += 1;
    const targetElements = pageHist.states[pageHist.index];

    const updated = [...pagesRef.current];
    updated[pIndex] = targetElements;
    setPages(updated);
    pagesRef.current = updated;

    updateUndoRedoState();
    scheduleFlush();
  }, [scheduleFlush, updateUndoRedoState]);

  const handleClearPage = useCallback(() => {
    handleElementsChange([]);
  }, [handleElementsChange]);

  const publishFullSync = useCallback(() => {
    invalidateWhiteboardFullSync();
    fullSyncPendingRef.current = true;
    dirtyRef.current = true;
    flushRef.current();
  }, []);

  const handleAddNewPage = useCallback(() => {
    const updated = [...pagesRef.current, []];
    const newIdx = updated.length - 1;
    setPages(updated);
    setCurrentPageIndex(newIdx);
    currentPageIndexRef.current = newIdx;
    pagesRef.current = updated;
    historyMapRef.current.set(newIdx, { states: [[]], index: 0 });
    const sent = lastSentRef.current.map((page) => page);
    sent[newIdx] = updated[newIdx] ?? [];
    lastSentRef.current = sent;
    void publishDataSafe(() => ({ type: 'WHITEBOARD_PAGE_COUNT', count: pagesRef.current.length })).then((result) => {
      if (!result.ok) publishFullSync();
    });
  }, [publishDataSafe, publishFullSync]);

  const handleDeletePages = useCallback(
    (indices: number[]) => {
      const currentPages = pagesRef.current;
      if (currentPages.length <= 1) {
        handleElementsChange([]);
        return;
      }

      const deleteSet = new Set(indices);
      if (deleteSet.size === 0) return;

      const updated = currentPages.filter((_, idx) => !deleteSet.has(idx));

      // Keep at least one page so the board never becomes empty.
      if (updated.length === 0) {
        const single: CanvasElement[][] = [[]];
        setPages(single);
        pagesRef.current = single;
        setCurrentPageIndex(0);
        currentPageIndexRef.current = 0;
        setSelectedPages([]);
        historyMapRef.current = new Map([[0, { states: [[]], index: 0 }]]);
        updateUndoRedoState();
        publishFullSync();
        return;
      }

      setPages(updated);
      pagesRef.current = updated;

      const prevCurrent = currentPageIndexRef.current;
      const nextIdx = deleteSet.has(prevCurrent)
        ? Math.min(prevCurrent, updated.length - 1)
        : prevCurrent - [...deleteSet].filter((d) => d < prevCurrent).length;
      setCurrentPageIndex(nextIdx);
      currentPageIndexRef.current = nextIdx;

      const sortedDeleted = [...deleteSet].sort((a, b) => a - b);
      setSelectedPages((prev) =>
        prev.filter((p) => !deleteSet.has(p)).map((p) => p - sortedDeleted.filter((d) => d < p).length),
      );

      historyMapRef.current = new Map(updated.map((page, idx) => [idx, { states: [page || []], index: 0 }]));
      updateUndoRedoState();
      publishFullSync();
    },
    [handleElementsChange, publishFullSync, updateUndoRedoState],
  );

  const handleDeletePage = useCallback(
    (pageIdx: number) => {
      handleDeletePages([pageIdx]);
    },
    [handleDeletePages],
  );

  const handleSwitchPage = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= pagesRef.current.length) return;
      setCurrentPageIndex(idx);
      currentPageIndexRef.current = idx;
      if (!historyMapRef.current.has(idx)) {
        historyMapRef.current.set(idx, { states: [pagesRef.current[idx] || []], index: 0 });
      }
      updateUndoRedoState();
    },
    [updateUndoRedoState],
  );

  const togglePageSelect = useCallback((idx: number) => {
    setSelectedPages((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  }, []);

  const selectAllPages = useCallback(() => {
    setSelectedPages((prev) => (prev.length === pagesRef.current.length ? [] : pagesRef.current.map((_, i) => i)));
  }, []);

  return {
    pages,
    setPages,
    pagesRef,
    currentPageIndex,
    setCurrentPageIndex,
    currentPageIndexRef,
    selectedPages,
    setSelectedPages,
    isPagesTrayOpen,
    setIsPagesTrayOpen,
    historyMapRef,
    isRemoteUpdateRef,
    hasAppliedLiveSyncRef,
    canUndo,
    canRedo,
    updateUndoRedoState,
    handleElementsChange,
    noteSnapshotSent,
    adoptRemotePage,
    handleUndo,
    handleRedo,
    handleClearPage,
    handleAddNewPage,
    handleDeletePage,
    handleDeletePages,
    publishFullSync,
    handleSwitchPage,
    togglePageSelect,
    selectAllPages,
  };
}
