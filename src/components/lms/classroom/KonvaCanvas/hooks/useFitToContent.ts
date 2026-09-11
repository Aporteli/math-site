import { useCallback } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../utils/types';

interface UseFitToContentOptions {
  containerRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<Konva.Stage>;
  elementsRef: MutableRefObject<CanvasElement[]>;
  scale: number;
  setStagePos: (pos: { x: number; y: number }) => void;
}

export function useFitToContent({
  containerRef,
  stageRef,
  elementsRef,
  scale,
  setStagePos,
}: UseFitToContentOptions) {
  return useCallback(() => {
    const stage = stageRef.current;
    const container = containerRef.current;
    if (!stage || !container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    if (width <= 0 || height <= 0) return;

    const currentElems = elementsRef.current;
    if (currentElems.length === 0) {
      setStagePos({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    currentElems.forEach((el) => {
      if (el.points && el.points.length > 0) {
        for (let i = 0; i < el.points.length; i += 2) {
          const px = (el.x || 0) + el.points[i];
          const py = (el.y || 0) + el.points[i + 1];
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      } else if (el.x !== undefined && el.y !== undefined) {
        const w = el.width || (el.radius ? el.radius * 2 : 150);
        const h = el.height || (el.radius ? el.radius * 2 : 60);
        if (el.x < minX) minX = el.x;
        if (el.x + w > maxX) maxX = el.x + w;
        if (el.y < minY) minY = el.y;
        if (el.y + h > maxY) maxY = el.y + h;
      }
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = width;
      minY = 0;
      maxY = height;
    }

    const padding = 30;
    setStagePos({ x: -minX * scale + padding * scale, y: -minY * scale + padding * scale });
  }, [containerRef, stageRef, elementsRef, scale, setStagePos]);
}