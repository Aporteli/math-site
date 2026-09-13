import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { CanvasElement } from '../utils/types';
import { distToSegmentSquared } from '../utils/geometry';

interface UseEraserOptions {
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  eraserWidth: number;
  activeTool: string;
}

export function useEraser({
  elementsRef,
  onElementsChange,
  selectedIds,
  setSelectedIds,
  eraserWidth,
  activeTool,
}: UseEraserOptions) {
  const [eraserCursorPos, setEraserCursorPos] = useState<{ x: number; y: number } | null>(null);
  const isErasing = useRef(false);
  const eraseStrokeDirtyRef = useRef(false);

  useEffect(() => {
    if (activeTool !== 'eraser') setEraserCursorPos(null);
  }, [activeTool]);

  const eraseAtPosition = useCallback(
    (pos: { x: number; y: number }) => {
      const threshold = Math.max(6, eraserWidth / 2);
      const thresholdSq = threshold * threshold;
      let hasChanges = false;

      const remaining = elementsRef.current.filter((el) => {
        if (el.points && el.points.length >= 2) {
          const ox = el.x || 0;
          const oy = el.y || 0;
          const pts = el.points;
          for (let i = 0; i < pts.length - 2; i += 2) {
            const x1 = ox + pts[i];
            const y1 = oy + pts[i + 1];
            const x2 = ox + pts[i + 2];
            const y2 = oy + pts[i + 3];
            if (distToSegmentSquared(pos.x, pos.y, x1, y1, x2, y2) <= thresholdSq) {
              hasChanges = true;
              return false;
            }
          }
        }
        if (el.type === 'circle' && el.x !== undefined && el.y !== undefined) {
          const rad = el.radius || 10;
          const distToCenter = Math.hypot(pos.x - el.x, pos.y - el.y);
          if (Math.abs(distToCenter - rad) <= threshold || distToCenter <= rad) {
            hasChanges = true;
            return false;
          }
        }
        if (
          (el.type === 'rect' ||
            el.type === 'text' ||
            el.type === 'triangle' ||
            el.type === 'diamond' ||
            el.type === 'star' ||
            el.type === 'image') &&
          el.x !== undefined &&
          el.y !== undefined
        ) {
          const w = el.width || 100;
          const h = el.height || 60;
          if (
            pos.x >= el.x - threshold &&
            pos.x <= el.x + w + threshold &&
            pos.y >= el.y - threshold &&
            pos.y <= el.y + h + threshold
          ) {
            hasChanges = true;
            return false;
          }
        }
        return true;
      });

      if (hasChanges) {
        elementsRef.current = remaining;
        eraseStrokeDirtyRef.current = true;
        onElementsChange(remaining, { commitHistory: false });
        if (selectedIds.length > 0) {
          const remainingIds = new Set(remaining.map((el) => el.id));
          const nextSelected = selectedIds.filter((id) => remainingIds.has(id));
          if (nextSelected.length !== selectedIds.length) setSelectedIds(nextSelected);
        }
      }
    },
    [onElementsChange, selectedIds, eraserWidth, elementsRef, setSelectedIds],
  );

  const commitErase = useCallback(() => {
    isErasing.current = false;
    if (eraseStrokeDirtyRef.current) {
      eraseStrokeDirtyRef.current = false;
      onElementsChange(elementsRef.current);
    }
  }, [onElementsChange, elementsRef]);

  return {
    eraserCursorPos,
    setEraserCursorPos,
    isErasing,
    eraseStrokeDirtyRef,
    eraseAtPosition,
    commitErase,
  };
}