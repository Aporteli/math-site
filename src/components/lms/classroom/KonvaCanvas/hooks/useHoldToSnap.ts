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
const HOLD_MS_LINE = 1000;

/** ამაზე ნაკლები „წვრილმანი" ძრავა ჩათვლით ადგილზე დგომად (ხელის კანკალი). */
const JITTER_PX = 6;

export function useHoldToSnap(opts: Options) {
  const lineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  /** რამდენი წერტილი იყო ბოლო სრული შემოწმების დროს — იცავს
   *  უსასრულო ციკლისგან, როცა მომხმარებელი რეალურად გაჩერდა. */
  const lastPointCountRef = useRef(0);

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
    lastPosRef.current = null;
    lastPointCountRef.current = 0;
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
  const trySnapLine = useCallback(() => {
    lineTimerRef.current = null;
    const shape = opts.activeShapeRef.current;
    if (!opts.isDrawing.current || !shape) return;

    const points = shape.points() as number[];
    if (points.length < 4) return;

    const line = recognizeLine(points);
    if (!line) return; // ხაზი არაა — სრული ტაიმერი გადაწყვეტს

    commitRecognized({ kind: 'line', line });
  }, [opts, commitRecognized]);

  /**
   * სრული ცდა — ყველა ფორმის ამოცნობა. ჩვეულ რიტმში (2000ms).
   * თუ ვერ ცნობს, ტაიმერს თავიდან აგეგმავს (სანამ ახალი წერტილები ემატება).
   */
  const trySnapShape = useCallback(() => {
    shapeTimerRef.current = null;
    const shape = opts.activeShapeRef.current;
    if (!opts.isDrawing.current || !shape) return;

    const points = shape.points() as number[];

    // თუ ახალი წერტილები არ დაემატა — მომხმარებელი რეალურად გაჩერდა.
    if (points.length <= lastPointCountRef.current) return;
    lastPointCountRef.current = points.length;

    const recognized = recognizeShape(points);

    if (!recognized) {
      // ვერ ვცანით, მაგრამ ხატვა გრძელდება — კიდევ ერთი შანსი.
      if (opts.isDrawing.current && opts.activeShapeRef.current) {
        shapeTimerRef.current = setTimeout(trySnapShape, HOLD_MS);
      }
      return;
    }

    commitRecognized(recognized);
  }, [opts, commitRecognized]);

  /**
   * ყოველ ახალ pointer-move-ზე.
   *
   * ორი ტაიმერი ერთდროულად ეშვება:
   *  - ხაზის ტაიმერი (500ms) — სწრაფი ცდა მხოლოდ ხაზისთვის.
   *  - სრული ტაიმერი (2000ms) — ყველა სხვა ფორმისთვის.
   *
   * ორივე ახლდება მოძრაობაზე, გარდა კანკალისა.
   */
  const noteStrokeMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (opts.activeTool !== 'pen') return;
      if (!opts.isDrawing.current || !opts.activeShapeRef.current) return;

      // ტაიმერები არ მუშაობს — ვრთავთ ორივეს.
      if (shapeTimerRef.current === null) {
        lastPosRef.current = pos;
        lineTimerRef.current = setTimeout(trySnapLine, HOLD_MS_LINE);
        shapeTimerRef.current = setTimeout(trySnapShape, HOLD_MS);
        return;
      }

      const last = lastPosRef.current;
      lastPosRef.current = pos;
      if (!last) return;

      // კანკალი — ტაიმერებს არ ვეხებით.
      if (Math.hypot(pos.x - last.x, pos.y - last.y) < JITTER_PX) return;

      // რეალური მოძრაობა — ორივე ტაიმერს გადავაყენებთ.
      if (lineTimerRef.current !== null) clearTimeout(lineTimerRef.current);
      if (shapeTimerRef.current !== null) clearTimeout(shapeTimerRef.current);
      lineTimerRef.current = setTimeout(trySnapLine, HOLD_MS_LINE);
      shapeTimerRef.current = setTimeout(trySnapShape, HOLD_MS);
    },
    [opts, trySnapLine, trySnapShape],
  );

  return { noteStrokeMove, cancelHold };
}