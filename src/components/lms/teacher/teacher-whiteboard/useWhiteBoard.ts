'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { diffBoard } from '@/lib/teacher-board/delta';
import {
  PENCIL_COLORS,
  PENCIL_WIDTHS,
  isStroke,
  newStrokeId,
  parseBoardPages,
  type BoardElement,
  type Stroke,
} from './drawing';

const BOARD_URL = '/api/teacher-board';

export function useWhiteBoard() {
  const [pages, setPages] = useState<BoardElement[][]>([[]]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [color, setColor] = useState<string>(PENCIL_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(PENCIL_WIDTHS[1]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const clientIdRef = useRef('');
  const pagesRef = useRef(pages);
  const savedPagesRef = useRef<BoardElement[][]>([[]]);
  const pageIndexRef = useRef(0);
  const saveChainRef = useRef(Promise.resolve());
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  pagesRef.current = pages;
  pageIndexRef.current = currentPageIndex;

  useEffect(() => {
    clientIdRef.current = crypto.randomUUID();
    let cancelled = false;

    async function loadBoard() {
      try {
        const response = await fetch(BOARD_URL, { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as {
          board?: { pages?: unknown; currentPageIndex?: unknown } | null;
        };
        if (cancelled || !data.board) return;
        const nextPages = parseBoardPages(data.board.pages);
        const nextIndex =
          typeof data.board.currentPageIndex === 'number'
            ? Math.min(nextPages.length - 1, Math.max(0, data.board.currentPageIndex))
            : 0;
        setPages(nextPages);
        setCurrentPageIndex(nextIndex);
        savedPagesRef.current = nextPages;
      } catch (error) {
        console.error('Failed to load teacher board', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBoard();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((nextPages: BoardElement[][], nextIndex: number) => {
    saveChainRef.current = saveChainRef.current
      .then(async () => {
        const previous = savedPagesRef.current;
        const changes = diffBoard(previous, nextPages);
        const body =
          changes.length > 0
            ? {
                type: 'delta' as const,
                clientId: clientIdRef.current,
                pageCount: nextPages.length,
                currentPageIndex: nextIndex,
                changes,
              }
            : {
                clientId: clientIdRef.current,
                pages: nextPages,
                currentPageIndex: nextIndex,
              };

        setSaving(true);
        const response = await fetch(BOARD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error('Save failed');
        savedPagesRef.current = nextPages;
      })
      .catch((error) => {
        console.error('Failed to save teacher board', error);
      })
      .finally(() => {
        setSaving(false);
      });
  }, []);

  const startStroke = useCallback(
    (x: number, y: number) => {
      drawingRef.current = true;
      const stroke: Stroke = {
        id: newStrokeId(),
        type: 'freedraw',
        points: [x, y],
        stroke: color,
        strokeWidth,
      };
      currentStrokeRef.current = stroke;
      setCurrentStroke(stroke);
    },
    [color, strokeWidth],
  );

  const extendStroke = useCallback((x: number, y: number) => {
    if (!drawingRef.current) return;
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    const points = stroke.points;
    const lastX = points[points.length - 2];
    const lastY = points[points.length - 1];
    if (lastX === x && lastY === y) return;
    const next: Stroke = { ...stroke, points: [...points, x, y] };
    currentStrokeRef.current = next;
    setCurrentStroke(next);
  }, []);

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    setCurrentStroke(null);
    if (!stroke || stroke.points.length < 4) return;
    const pageIndex = pageIndexRef.current;
    const nextPages = pagesRef.current.map((page, index) => (index === pageIndex ? [...page, stroke] : page));
    setPages(nextPages);
    persist(nextPages, pageIndex);
  }, [persist]);

  const confirmClear = useCallback(() => {
    const pageIndex = pageIndexRef.current;
    const nextPages = pagesRef.current.map((page, index) => (index === pageIndex ? [] : page));
    setPages(nextPages);
    currentStrokeRef.current = null;
    setCurrentStroke(null);
    setClearOpen(false);
    persist(nextPages, pageIndex);
  }, [persist]);

  const strokes = pages[currentPageIndex]?.filter(isStroke) ?? [];

  return {
    strokes,
    currentStroke,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    loading,
    saving,
    clearOpen,
    setClearOpen,
    startStroke,
    extendStroke,
    finishStroke,
    confirmClear,
  };
}
