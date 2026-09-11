import { useCallback } from 'react';
import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import { stylusUpPhase } from '../utils/pointer-up/stylusUpPhase';
import { releasePointerOwnership } from '../utils/pointer-up/releasePointerOwnership';
import { handleLaserUp } from '../utils/pointer-up/handleLaserUp';
import { handleEraserUp } from '../utils/pointer-up/handleEraserUp';
import { buildElementFromShape } from '../utils/pointer-up/buildElementFromShape';
import { commitShape } from '../utils/pointer-up/commitShape';

export function usePointerUpHandler(ctx: PointerHandlerContext) {
  const {
    activeTool,
    strokeColor,
    strokeWidth,
    elementsRef,
    isDrawing,
    activeShapeRef,
    activeShapeIdRef,
    isStylusActiveRef,
    activePointerIdRef,
    isLasering,
    triggerLaserFade,
    commitErase,
    onElementsChange,
    onLaserMove,
    syncStylusButtonsFromEvent,
  } = ctx;

  return useCallback(
    (e: any) => {
      const evt = e.evt as PointerEvent;

      // 1. Pen barrel button release (early return if tip is still down)
      if (stylusUpPhase({ isStylusActiveRef, syncStylusButtonsFromEvent }, evt)) {
        return;
      }

      // 2. Release pointer-level bookkeeping
      releasePointerOwnership({ activePointerIdRef, isStylusActiveRef }, evt);

      // 3. Tool-specific branch
      if (handleLaserUp({ activeTool, isLasering, triggerLaserFade, onLaserMove })) return;
      if (handleEraserUp({ activeTool, commitErase })) return;

      // 4. Shape-drawing branch
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (!activeShapeRef.current) return;

      const newElem = buildElementFromShape({
        activeTool,
        activeShapeId: activeShapeIdRef.current,
        shape: activeShapeRef.current,
        strokeColor,
        strokeWidth,
      });

      activeShapeRef.current = null;

      if (newElem) {
        commitShape({ elementsRef, onElementsChange }, newElem);
      }
    },
    [
      syncStylusButtonsFromEvent,
      activePointerIdRef,
      isStylusActiveRef,
      activeTool,
      isLasering,
      triggerLaserFade,
      onLaserMove,
      commitErase,
      isDrawing,
      activeShapeRef,
      activeShapeIdRef,
      strokeColor,
      strokeWidth,
      elementsRef,
      onElementsChange,
    ],
  );
}