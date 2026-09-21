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
    if (drawLayerRef.current && !isDrawing.current) {
      drawLayerRef.current.destroyChildren();
      drawLayerRef.current.batchDraw();
    }
  }, [elements, drawLayerRef, isDrawing]);
}