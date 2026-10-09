//CUT

import { useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import { getCenter } from '../utils/geometry';

interface UsePinchZoomOptions {
  stageRef: RefObject<Konva.Stage>;
  drawLayerRef: RefObject<Konva.Layer>;
  isDrawing: MutableRefObject<boolean>;
  activeShapeRef: MutableRefObject<any>;
  stagePos: { x: number; y: number };
  setStagePos: (pos: { x: number; y: number }) => void;
  /** When true, two-finger pan is disabled (lock/sync feature). */
  disabled?: boolean;
}

export function usePinchZoom({
  stageRef,
  drawLayerRef,
  isDrawing,
  activeShapeRef,
  stagePos,
  setStagePos,
  disabled = false,
}: UsePinchZoomOptions) {
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const isPinching = useRef<boolean>(false);

  const handleTouchStart = (e: any) => {
    if (disabled) return;
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches) return;

    if (touchEvent.touches.length === 2) {
      isPinching.current = true;
      if (isDrawing.current && activeShapeRef.current) {
        isDrawing.current = false;
        activeShapeRef.current.destroy();
        activeShapeRef.current = null;
        drawLayerRef.current?.batchDraw();
      }

      const t1 = touchEvent.touches[0];
      const t2 = touchEvent.touches[1];
      lastCenter.current = getCenter(
        { x: t1.clientX, y: t1.clientY },
        { x: t2.clientX, y: t2.clientY },
      );
    }
  };

  const handleTouchMove = (e: any) => {
    if (disabled) return;
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches || touchEvent.touches.length !== 2 || !stageRef.current) return;

    e.evt.preventDefault();
    isPinching.current = true;

    const t1 = touchEvent.touches[0];
    const t2 = touchEvent.touches[1];
    const center = getCenter(
      { x: t1.clientX, y: t1.clientY },
      { x: t2.clientX, y: t2.clientY },
    );

    if (!lastCenter.current) {
      lastCenter.current = center;
      return;
    }

    const dx = center.x - lastCenter.current.x;
    const dy = center.y - lastCenter.current.y;
    lastCenter.current = center;

    setStagePos({
      x: stagePos.x + dx,
      y: stagePos.y + dy,
    });
  };

  const handleTouchEnd = (e: any) => {
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches || touchEvent.touches.length < 2) {
      lastCenter.current = null;
      setTimeout(() => {
        isPinching.current = false;
      }, 50);
    }
  };

  return { isPinching, handleTouchStart, handleTouchMove, handleTouchEnd };
}
