import { useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import { getDistance, getCenter } from '../utils/geometry';

interface UsePinchZoomOptions {
  containerRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<Konva.Stage>;
  drawLayerRef: RefObject<Konva.Layer>;
  isDrawing: MutableRefObject<boolean>;
  activeShapeRef: MutableRefObject<any>;
  scale: number;
  stagePos: { x: number; y: number };
  onScaleChange?: (newScale: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;
}

export function usePinchZoom({
  containerRef,
  stageRef,
  drawLayerRef,
  isDrawing,
  activeShapeRef,
  scale,
  stagePos,
  onScaleChange,
  setStagePos,
}: UsePinchZoomOptions) {
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number>(0);
  const isPinching = useRef<boolean>(false);

  const handleTouchStart = (e: any) => {
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
      const p1 = { x: t1.clientX, y: t1.clientY };
      const p2 = { x: t2.clientX, y: t2.clientY };

      lastDist.current = getDistance(p1, p2);
      lastCenter.current = getCenter(p1, p2);
    }
  };

  const handleTouchMove = (e: any) => {
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches || touchEvent.touches.length !== 2 || !stageRef.current) return;

    e.evt.preventDefault();
    isPinching.current = true;

    const t1 = touchEvent.touches[0];
    const t2 = touchEvent.touches[1];
    const p1 = { x: t1.clientX, y: t1.clientY };
    const p2 = { x: t2.clientX, y: t2.clientY };

    const dist = getDistance(p1, p2);
    const center = getCenter(p1, p2);

    if (!lastCenter.current) {
      lastCenter.current = center;
      lastDist.current = dist;
      return;
    }

    const oldScale = scale;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentCenterStage = {
      x: (center.x - rect.left - stagePos.x) / oldScale,
      y: (center.y - rect.top - stagePos.y) / oldScale,
    };

    const scaleFactor = dist / (lastDist.current || dist);
    const newScale = Math.max(0.2, Math.min(4, Math.round(oldScale * scaleFactor * 100) / 100));

    const dx = center.x - lastCenter.current.x;
    const dy = center.y - lastCenter.current.y;

    const newPos = {
      x: center.x - rect.left - currentCenterStage.x * newScale + dx,
      y: center.y - rect.top - currentCenterStage.y * newScale + dy,
    };

    lastDist.current = dist;
    lastCenter.current = center;

    setStagePos(newPos);
    if (newScale !== oldScale) {
      onScaleChange?.(newScale);
    }
  };

  const handleTouchEnd = (e: any) => {
    const touchEvent = e.evt as TouchEvent;
    if (!touchEvent.touches || touchEvent.touches.length < 2) {
      lastCenter.current = null;
      lastDist.current = 0;
      setTimeout(() => {
        isPinching.current = false;
      }, 50);
    }
  };

  return { isPinching, handleTouchStart, handleTouchMove, handleTouchEnd };
}