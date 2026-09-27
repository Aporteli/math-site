// KonvaCanvas/hooks/useHoldToSnap.ts

import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../utils/types';
import { recognizeShape } from '../utils/recognize/recognizeShape';
import { recognizeLine } from '../utils/recognize/recognizePolygon';
import { commitShape } from '../utils/pointer-up/commitShape';

interface Options {
  activeTool: string;
  strokeColor: string;
  strokeWidth: number;
  isDrawing: MutableRefObject<boolean>;
  activeShapeRef: MutableRefObject<any>;
  activeShapeIdRef: MutableRefObject<string>;
  drawLayerRef: RefObject<Konva.Layer>;
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
}

/** სრული ამოცნობის დრო (ms) — ყველა ფორმისთვის. */
const HOLD_MS = 2000;

/** სწრაფი ხაზის ამოცნობის დრო (ms) — მხოლოდ ხაზისთვის.
 *  ხაზი მარტივი ფორმაა, 2 წამი ლოდინი ზედმეტია. */
const HOLD_MS_LINE = 2000;

/** Leaving this radius counts as drawing and restarts the hold. */
const HOLD_RADIUS_PX = 8;

export function useHoldToSnap(opts: Options) {
  const lineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimers = useCallback(() => {
    if (lineTimerRef.current !== null) {
      clearTimeout(lineTimerRef.current);
      lineTimerRef.current = null;
    }
    if (shapeTimerRef.current !== null) {
      clearTimeout(shapeTimerRef.current);
      shapeTimerRef.current = null;
    }
  }, []);

  const cancelHold = useCallback(() => {
    clearTimers();
    anchorRef.current = null;
  }, [clearTimers]);

  useEffect(() => cancelHold, [cancelHold]);

  /**
   * საერთო commit ლოგიკა — ამოცნობილი ფორმის payload-ის აწყობა,
   * ხელნაწერი შტრიხის წაშლა და commitShape-ის გამოძახება.
   */
  const commitRecognized = useCallback(
    (recognized: ReturnType<typeof recognizeShape> & object) => {
      const shape = opts.activeShapeRef.current;
      if (!shape) return;

      // ფორმა ამოცნობილია — ტაიმერები აღარ გვჭირდება.
      clearTimers();

      // ხელნაწერი შტრიხი ქრება, რჩება მხოლოდ იდეალური ფორმა.
      shape.destroy();
      opts.activeShapeRef.current = null;
      opts.isDrawing.current = false;
      opts.drawLayerRef.current?.batchDraw();

      let payload: Partial<CanvasElement>;
      switch (recognized.kind) {
        case 'circle':
          payload = {
            type: 'circle',
            x: recognized.circle.cx,
            y: recognized.circle.cy,
            radius: recognized.circle.r,
          };
          break;

        case 'rect':
          payload = {
            type: 'rect',
            x: recognized.rect.x,
            y: recognized.rect.y,
            width: recognized.rect.width,
            height: recognized.rect.height,
            rotation: recognized.rect.rotation,
          };
          break;

        case 'triangle':
          payload = {
            type: 'triangle',
            points: recognized.triangle.points,
            x: 0,
            y: 0,
          };
          break;

        case 'parallelogram':
          payload = {
            type: 'parallelogram',
            points: recognized.parallelogram.points,
            x: 0,
            y: 0,
          };
          break;

        case 'line':
          payload = {
            type: 'line',
            points: recognized.line.points,
            x: 0,
            y: 0,
          };
          break;
      }

      commitShape(
        { elementsRef: opts.elementsRef, onElementsChange: opts.onElementsChange },
        {
          id: opts.activeShapeIdRef.current,
          stroke: opts.strokeColor,
          strokeWidth: opts.strokeWidth,
          ...payload,
        } as any,
      );
    },
    [opts, clearTimers],
  );

  /**
   * სწრაფი ცდა — მხოლოდ ხაზის ამოცნობა. თუ წარმატებულია, მაშინვე ვასრულებთ
   * და სრულ ტაიმერსაც ვაუქმებთ. თუ არა — ჩუმად ვბრუნდებით და სრული ტაიმერი
   * გააგრძელებს მუშაობას.
   */
  const armTimers = () => {
    if (lineTimerRef.current !== null) clearTimeout(lineTimerRef.current);
    if (shapeTimerRef.current !== null) clearTimeout(shapeTimerRef.current);
    lineTimerRef.current = setTimeout(trySnapLine, HOLD_MS_LINE);
    shapeTimerRef.current = setTimeout(trySnapShape, HOLD_MS);
  };

  const trySnapLine = useCallback(() => {
    lineTimerRef.current = null;
    const shape = opts.activeShapeRef.current;
    const anchor = anchorRef.current;
    if (!opts.isDrawing.current || !shape || !anchor) return;

    const points = shape.points() as number[];
    if (points.length < 4) return;
    const x = points[points.length - 2];
    const y = points[points.length - 1];
    if (Math.hypot(x - anchor.x, y - anchor.y) >= HOLD_RADIUS_PX) return;

    const line = recognizeLine(points);
    if (!line) return;

    commitRecognized({ kind: 'line', line });
  }, [opts, commitRecognized]);

  const trySnapShape = useCallback(() => {
    shapeTimerRef.current = null;
    const shape = opts.activeShapeRef.current;
    const anchor = anchorRef.current;
    if (!opts.isDrawing.current || !shape || !anchor) return;

    const points = shape.points() as number[];
    const x = points[points.length - 2];
    const y = points[points.length - 1];
    if (Math.hypot(x - anchor.x, y - anchor.y) >= HOLD_RADIUS_PX) return;

    const recognized = recognizeShape(points);
    if (!recognized) return;

    commitRecognized(recognized);
  }, [opts, commitRecognized]);

  const noteStrokeMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (opts.activeTool !== 'pen') return;
      if (!opts.isDrawing.current || !opts.activeShapeRef.current) return;

      const anchor = anchorRef.current;
      if (!anchor || Math.hypot(pos.x - anchor.x, pos.y - anchor.y) >= HOLD_RADIUS_PX) {
        anchorRef.current = pos;
        armTimers();
        return;
      }

      if (shapeTimerRef.current === null) armTimers();
    },
    [opts, trySnapLine, trySnapShape],
  );

  return { noteStrokeMove, cancelHold };
}
