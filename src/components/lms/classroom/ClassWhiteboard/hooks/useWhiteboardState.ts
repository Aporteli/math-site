//CUT

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import { adaptStrokeForTheme } from '../utils/theme';
import type { HistoryMap } from '../utils/types';
import {
  getCourseWhiteboardAction,
  saveCourseWhiteboardAction,
} from '@/lib/actions/course-whiteboard';

interface Options {
  courseId: string;
  isTeacher: boolean;
  isDark: boolean;
  publishDataSafe: (payload: any, reliable?: boolean) => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 1500;

export function useWhiteboardState({ courseId, isTeacher, isDark, publishDataSafe }: Options) {
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

  const historyMapRef = useRef<HistoryMap>(
    new Map([[0, { states: [pages[0] || []], index: 0 }]]),
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pagesRef = useRef<CanvasElement[][]>(pages);
  const currentPageIndexRef = useRef<number>(0);

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
          const isPristine =
            pagesRef.current.length === 1 && (pagesRef.current[0]?.length ?? 0) === 0;

          if (isPristine) {
            const loadedPages = data.pages as CanvasElement[][];
            const loadedIndex =
              typeof data.currentPageIndex === 'number' ? data.currentPageIndex : 0;

            setPages(loadedPages);
            pagesRef.current = loadedPages;
            setCurrentPageIndex(loadedIndex);
            currentPageIndexRef.current = loadedIndex;

            historyMapRef.current = new Map(
              loadedPages.map((page, idx) => [idx, { states: [page || []], index: 0 }]),
            );
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

  // Theme conversion
  useEffect(() => {
    let updated = false;
    const newPages = pagesRef.current.map((page) =>
      page.map((el) => {
        const nextStroke = adaptStrokeForTheme(el.stroke, isDark);
        if (nextStroke !== el.stroke) {
          updated = true;
          return { ...el, stroke: nextStroke };
        }
        return el;
      }),
    );

    if (updated) {
      setPages(newPages);
      pagesRef.current = newPages;

      const pIndex = currentPageIndexRef.current;
      const hist = historyMapRef.current.get(pIndex);
      if (hist) {
        const nextStates = hist.states.slice(0, hist.index + 1);
        nextStates.push(newPages[pIndex]);
        historyMapRef.current.set(pIndex, { states: nextStates, index: nextStates.length - 1 });
        updateUndoRedoState();
      }
    }
  }, [isDark, updateUndoRedoState]);

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
        void saveCourseWhiteboardAction(courseId, pending.pages, pending.pageIndex);
      }
    };
  }, [isTeacher, courseId]);

  const handleElementsChange = useCallback(
    (newElems: CanvasElement[], options?: { commitHistory?: boolean }) => {
      if (isRemoteUpdateRef.current) return;
      const pIndex = currentPageIndexRef.current;
      const updated = [...pagesRef.current];
      updated[pIndex] = newElems;
      setPages(updated);
      pagesRef.current = updated;

      if (options?.commitHistory !== false) {
        let pageHist = historyMapRef.current.get(pIndex);
        if (!pageHist) pageHist = { states: [[]], index: 0 };
        const nextStates = pageHist.states.slice(0, pageHist.index + 1);
        nextStates.push(newElems);
        historyMapRef.current.set(pIndex, { states: nextStates, index: nextStates.length - 1 });
        updateUndoRedoState();
      }

      void publishDataSafe({
        type: 'WHITEBOARD_SYNC',
        pageIndex: pIndex,
        elements: newElems,
      });
    },
    [publishDataSafe, updateUndoRedoState],
  );

  const handleUndo = useCallback(() => {
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
    void publishDataSafe({ type: 'WHITEBOARD_SYNC', pageIndex: pIndex, elements: targetElements });
  }, [publishDataSafe, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
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
    void publishDataSafe({ type: 'WHITEBOARD_SYNC', pageIndex: pIndex, elements: targetElements });
  }, [publishDataSafe, updateUndoRedoState]);

  const handleClearPage = useCallback(() => {
    handleElementsChange([]);
  }, [handleElementsChange]);

  const handleAddNewPage = useCallback(() => {
    const updated = [...pagesRef.current, []];
    const newIdx = updated.length - 1;
    setPages(updated);
    setCurrentPageIndex(newIdx);
    historyMapRef.current.set(newIdx, { states: [[]], index: 0 });
    void publishDataSafe({ type: 'WHITEBOARD_PAGE_COUNT', count: updated.length });
  }, [publishDataSafe]);

  const handleDeletePages = useCallback((indices: number[]) => {
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
      void publishDataSafe({ type: 'WHITEBOARD_PAGE_COUNT', count: 1 });
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
      prev
        .filter((p) => !deleteSet.has(p))
        .map((p) => p - sortedDeleted.filter((d) => d < p).length),
    );

    void publishDataSafe({ type: 'WHITEBOARD_PAGE_COUNT', count: updated.length });
  }, [handleElementsChange, publishDataSafe, updateUndoRedoState]);

  const handleDeletePage = useCallback((pageIdx: number) => {
    handleDeletePages([pageIdx]);
  }, [handleDeletePages]);

  const handleSwitchPage = useCallback((idx: number) => {
    if (idx < 0 || idx >= pagesRef.current.length) return;
    setCurrentPageIndex(idx);
    if (!historyMapRef.current.has(idx)) {
      historyMapRef.current.set(idx, { states: [pagesRef.current[idx] || []], index: 0 });
    }
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const togglePageSelect = useCallback((idx: number) => {
    setSelectedPages((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  }, []);

  const selectAllPages = useCallback(() => {
    setSelectedPages((prev) =>
      prev.length === pagesRef.current.length ? [] : pagesRef.current.map((_, i) => i),
    );
  }, []);

  return {
    pages, setPages, pagesRef,
    currentPageIndex, setCurrentPageIndex, currentPageIndexRef,
    selectedPages, setSelectedPages,
    isPagesTrayOpen, setIsPagesTrayOpen,
    historyMapRef, isRemoteUpdateRef, hasAppliedLiveSyncRef,
    canUndo, canRedo, updateUndoRedoState,
    handleElementsChange, handleUndo, handleRedo,
    handleClearPage, handleAddNewPage, handleDeletePage, handleDeletePages,
    handleSwitchPage, togglePageSelect, selectAllPages,
  };
}