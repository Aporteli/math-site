'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PENCIL_COLORS, PENCIL_WIDTHS, newStrokeId, parseStrokes, type Stroke } from './drawing';

const BOARD_URL = '/api/teacher-board';

export function useWhiteBoard() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [color, setColor] = useState<string>(PENCIL_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(PENCIL_WIDTHS[1]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const strokesRef = useRef(strokes);
  const saveChainRef = useRef(Promise.resolve());
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  strokesRef.current = strokes;

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      try {
        const response = await fetch(BOARD_URL, { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as {
          board?: { strokes?: unknown } | null;
        };
        if (cancelled || !data.board) return;
        setStrokes(parseStrokes(data.board.strokes));
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

  const persist = useCallback((nextStrokes: Stroke[]) => {
    saveChainRef.current = saveChainRef.current
      .then(async () => {
        setSaving(true);
        const response = await fetch(BOARD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strokes: nextStrokes }),
        });
        if (!response.ok) throw new Error('Save failed');
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
    const nextStrokes = [...strokesRef.current, stroke];
    setStrokes(nextStrokes);
    persist(nextStrokes);
  }, [persist]);

  const confirmClear = useCallback(() => {
    setStrokes([]);
    currentStrokeRef.current = null;
    setCurrentStroke(null);
    setClearOpen(false);
    persist([]);
  }, [persist]);

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
