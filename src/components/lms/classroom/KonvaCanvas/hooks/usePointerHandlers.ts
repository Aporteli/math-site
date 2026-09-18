import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import { usePointerDownHandler } from './usePointerDownHandler';
import { usePointerMoveHandler } from './usePointerMoveHandler';
import { usePointerUpHandler } from './usePointerUpHandler';
import { useHoldToSnap } from './useHoldToSnap';

/** KonvaCanvas-იდან მოდის; hold-to-snap-ის ორ callbacks აქ ემატება. */
type CanvasPointerContext = Omit<PointerHandlerContext, 'noteStrokeMove' | 'cancelHoldToSnap'>;

export function usePointerHandlers(ctx: CanvasPointerContext) {
  // ხატვისას „2 წამი ადგილზე" → იდეალური წრე
  const { noteStrokeMove, cancelHold } = useHoldToSnap({
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

  const fullCtx: PointerHandlerContext = { ...ctx, noteStrokeMove, cancelHoldToSnap: cancelHold };

  const handlePointerDown = usePointerDownHandler(fullCtx);
  const handlePointerMove = usePointerMoveHandler(fullCtx);
  const handlePointerUp = usePointerUpHandler(fullCtx);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
