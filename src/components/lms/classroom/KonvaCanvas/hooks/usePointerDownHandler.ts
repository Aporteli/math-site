import { useCallback } from 'react';
import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import { stylusDownPhase } from '../utils/pointer-down/stylusDownPhase';
import { claimPointer } from '../utils/pointer-down/claimPointer';
import { handleLaserDown } from '../utils/pointer-down/handleLaserDown';
import { handleEraserDown } from '../utils/pointer-down/handleEraserDown';
import { handleSelectDown } from '../utils/pointer-down/handleSelectDown';
import { handleTextDown } from '../utils/pointer-down/handleTextDown';
import { handleShapeDown } from '../utils/pointer-down/handleShapeDown';

export function usePointerDownHandler(ctx: PointerHandlerContext) {
  const {
    isPinching,
    stylusOnly,
    isStylusActiveRef,
    syncStylusButtonsFromEvent,
    activePointerIdRef,
    activeTool,
    getRelativePointerPosition,
    isDrawing,
    activeShapeRef,
    drawLayerRef,
    startMarquee,
    isLasering,
    startLaserDrawing,
    onLaserMove,
    isErasing,
    eraseStrokeDirtyRef,
    setEraserCursorPos,
    eraseAtPosition,
    elementsRef,
    currentFontSize,
    strokeColor,
    setSelectedIds,
    onElementsChange,
    startTextInlineEditing,
    activeShapeIdRef,
    strokeWidth,
  } = ctx;

  return useCallback(
    (e: any) => {
      if (isPinching.current) return;

      const evt = e.evt as PointerEvent;

      // 1. Stylus / touch gating
      if (
        stylusDownPhase(
          { stylusOnly, isStylusActiveRef, syncStylusButtonsFromEvent },
          evt,
        )
      ) {
        return;
      }

      // 2. Claim pointer id
      if (!claimPointer(activePointerIdRef, evt)) return;

      if (activeTool === 'hand') return;

      const pos = getRelativePointerPosition();
      if (!pos) return;

      // 3. Dispatch by tool
      if (handleLaserDown({ activeTool, isLasering, startLaserDrawing, onLaserMove }, pos)) return;

      if (
        handleEraserDown(
          { activeTool, isErasing, eraseStrokeDirtyRef, setEraserCursorPos, eraseAtPosition },
          pos,
        )
      )
        return;

      if (handleSelectDown({ activeTool, getRelativePointerPosition, startMarquee }, e)) return;

      if (
        handleTextDown(
          {
            activeTool,
            elementsRef,
            onElementsChange,
            setSelectedIds,
            startTextInlineEditing,
            currentFontSize,
            strokeColor,
          },
          pos,
        )
      )
        return;

      handleShapeDown(
        {
          activeTool,
          elementsRef,
          isDrawing,
          activeShapeIdRef,
          activeShapeRef,
          drawLayerRef,
          strokeColor,
          strokeWidth,
        },
        pos,
      );
    },
    [
      isPinching,
      stylusOnly,
      isStylusActiveRef,
      syncStylusButtonsFromEvent,
      activePointerIdRef,
      activeTool,
      getRelativePointerPosition,
      isDrawing,
      activeShapeRef,
      drawLayerRef,
      startMarquee,
      isLasering,
      startLaserDrawing,
      onLaserMove,
      isErasing,
      eraseStrokeDirtyRef,
      setEraserCursorPos,
      eraseAtPosition,
      elementsRef,
      currentFontSize,
      strokeColor,
      setSelectedIds,
      onElementsChange,
      startTextInlineEditing,
      activeShapeIdRef,
      strokeWidth,
    ],
  );
}