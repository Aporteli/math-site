import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { CanvasElement } from '../utils/types';

interface UseElementTransformOptions {
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
}

export function useElementTransform({ elementsRef, onElementsChange }: UseElementTransformOptions) {
  const handleDragEnd = useCallback(
    (id: string, e: any) => {
      const updated = elementsRef.current.map((el) => {
        if (el.id === id) return { ...el, x: e.target.x(), y: e.target.y() };
        return el;
      });
      onElementsChange(updated);
    },
    [elementsRef, onElementsChange],
  );

  const handleTransformEnd = useCallback(
    (id: string, e: any) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      const rotation = node.rotation();

      const updated = elementsRef.current.map((el) => {
        if (el.id === id) {
          if (el.type === 'image') {
            node.scaleX(1);
            node.scaleY(1);
            return {
              ...el,
              x: node.x(),
              y: node.y(),
              rotation,
              width: Math.max(20, (el.width || 100) * scaleX),
              height: Math.max(20, (el.height || 100) * scaleY),
            };
          }
          if (el.type === 'text') {
            const newWidth = Math.max(80, (el.width || 550) * scaleX);
            node.scaleX(1);
            node.scaleY(1);
            return { ...el, x: node.x(), y: node.y(), rotation, width: newWidth, scaleX: 1, scaleY: 1 };
          }
          if (el.type === 'rect') {
            const newW = Math.max(5, (el.width || 10) * scaleX);
            const newH = Math.max(5, (el.height || 10) * scaleY);
            node.scaleX(1);
            node.scaleY(1);
            return { ...el, x: node.x(), y: node.y(), rotation, width: newW, height: newH, scaleX: 1, scaleY: 1 };
          }
          if (el.type === 'circle' || el.type === 'star') {
            const newRad = Math.max(5, (el.radius || 10) * Math.max(scaleX, scaleY));
            node.scaleX(1);
            node.scaleY(1);
            return { ...el, x: node.x(), y: node.y(), rotation, radius: newRad, scaleX: 1, scaleY: 1 };
          }
          if (
            el.type === 'freedraw' ||
            el.type === 'line' ||
            el.type === 'arrow' ||
            el.type === 'triangle' ||
            el.type === 'diamond'
          ) {
            const pts = el.points || [];
            const newPoints: number[] = [];
            for (let i = 0; i < pts.length; i += 2) {
              newPoints.push(pts[i] * scaleX, pts[i + 1] * scaleY);
            }
            node.scaleX(1);
            node.scaleY(1);
            return { ...el, x: node.x(), y: node.y(), rotation, points: newPoints, scaleX: 1, scaleY: 1 };
          }
          return { ...el, x: node.x(), y: node.y(), rotation };
        }
        return el;
      });
      onElementsChange(updated);
    },
    [elementsRef, onElementsChange],
  );

  return { handleDragEnd, handleTransformEnd };
}