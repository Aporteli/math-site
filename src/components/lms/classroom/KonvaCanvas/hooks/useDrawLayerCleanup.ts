import { useEffect } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from '../utils/types';

export function useDrawLayerCleanup(
  drawLayerRef: RefObject<Konva.Layer>,
  isDrawing: MutableRefObject<boolean>,
  elements: CanvasElement[],
) {
  useEffect(() => {
    const layer = drawLayerRef.current;
    if (!layer || isDrawing.current) return;
    // Leave the preview up through the next paint, so the committed stroke
    // is already on the main layer before the preview disappears.
    const frame = requestAnimationFrame(() => {
      if (isDrawing.current) return;
      layer.destroyChildren();
      layer.batchDraw();
    });
    return () => cancelAnimationFrame(frame);
  }, [elements, drawLayerRef, isDrawing]);
}