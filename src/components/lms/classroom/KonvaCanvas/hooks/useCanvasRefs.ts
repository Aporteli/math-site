import { useRef } from 'react';
import type Konva from 'konva';
import type { CanvasElement } from '../utils/types';

export function useCanvasRefs(elements: CanvasElement[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const drawLayerRef = useRef<Konva.Layer>(null);
  const marqueeLayerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const isDrawing = useRef(false);
  const activeShapeRef = useRef<Konva.Shape | null>(null);
  const activeShapeIdRef = useRef<string>('');
  const elementsRef = useRef<CanvasElement[]>(elements);
  // Pointer handlers read this ref immediately, before effects run.
  // eslint-disable-next-line react-hooks/refs -- must match the elements rendered this pass
  elementsRef.current = elements;
  const isStylusActiveRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  return {
    containerRef,
    stageRef,
    mainLayerRef,
    drawLayerRef,
    marqueeLayerRef,
    trRef,
    isDrawing,
    activeShapeRef,
    activeShapeIdRef,
    elementsRef,
    isStylusActiveRef,
    activePointerIdRef,
  };
}
