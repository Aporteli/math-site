import { useRef } from 'react';
import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import type { PointerSpace } from '../utils/pointer-space';
import { usePointerDownHandler } from './usePointerDownHandler';
import { usePointerMoveHandler } from './usePointerMoveHandler';
import { usePointerUpHandler } from './usePointerUpHandler';
import { useHoldToSnap } from './useHoldToSnap';

/** KonvaCanvas-იდან მოდის; hold-to-snap-ის callbacks აქ ემატება. */
type CanvasPointerContext = Omit<
  PointerHandlerContext,
  'noteStrokeMove' | 'cancelHoldToSnap' | 'isAdjustingLine' | 'pointerSpaceRef'
>;

export function usePointerHandlers(ctx: CanvasPointerContext) {
  const pointerSpaceRef = useRef<PointerSpace | null>(null);
  // ხატვისას „2 წამი ადგილზე" → იდეალური წრე
  const { noteStrokeMove, cancelHold, isAdjustingLine } = useHoldToSnap({
    activeTool: ctx.activeTool,
    strokeColor: ctx.strokeColor,
    strokeWidth: ctx.strokeWidth,
    isDrawing: ctx.isDrawing,
    activeShapeRef: ctx.activeShapeRef,
    activeShapeIdRef: ctx.activeShapeIdRef,
    drawLayerRef: ctx.drawLayerRef,
    elementsRef: ctx.elementsRef,
    onElementsChange: ctx.onElementsChange,
  });

  const fullCtx: PointerHandlerContext = {
    ...ctx,
    pointerSpaceRef,
    noteStrokeMove,
    cancelHoldToSnap: cancelHold,
    isAdjustingLine,
  };

  const handlePointerDown = usePointerDownHandler(fullCtx);
  const handlePointerMove = usePointerMoveHandler(fullCtx);
  const handlePointerUp = usePointerUpHandler(fullCtx);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
