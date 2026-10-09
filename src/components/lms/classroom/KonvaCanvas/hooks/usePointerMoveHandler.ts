import { useCallback } from 'react';
import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import { stylusMovePhase } from '../utils/pointer-move/stylusMovePhase';
import { updateEraserHover } from '../utils/pointer-move/updateEraserHover';
import { handleLaserMove } from '../utils/pointer-move/handleLaserMove';
import { handleEraserMove } from '../utils/pointer-move/handleEraserMove';
import { updateActiveShape } from '../utils/pointer-move/updateActiveShape';
import { pointerSpaceFor } from '../utils/pointer-space';

export function usePointerMoveHandler(ctx: PointerHandlerContext) {
  const {
    scale,
    activeTool,
    stylusOnly,
    containerRef,
    stageRef,
    pointerSpaceRef,
    drawLayerRef,
    elementsRef,
    isDrawing,
    activeShapeRef,
    isStylusActiveRef,
    activePointerIdRef,
    isPinching,
    isLasering,
    isErasing,
    stylusPrimaryHeldRef,
    stylusSecondaryHeldRef,
    eraserCursorPos,
    setEraserCursorPos,
    getRelativePointerPosition,
    updateMarquee,
    addLaserPoint,
    eraseAtPosition,
    onLaserMove,
    syncStylusButtonsFromEvent,
    noteStrokeMove,
    isAdjustingLine,
  } = ctx;

  return useCallback(
    (e: any) => {
      if (isPinching.current) return;
      const evt = e.evt as PointerEvent;
      if (
        stylusMovePhase(
          {
            stylusOnly,
            isStylusActiveRef,
            stylusPrimaryHeldRef,
            stylusSecondaryHeldRef,
            syncStylusButtonsFromEvent,
          },
          evt,
        )
      ) {
        return;
      }
      updateEraserHover({ activeTool, eraserCursorPos, getRelativePointerPosition, setEraserCursorPos });
      if (evt.pointerId !== activePointerIdRef.current) return;
      const nativeEvt = e.evt;
      const events = (nativeEvt.getCoalescedEvents ? nativeEvt.getCoalescedEvents() : [nativeEvt]) as PointerEvent[];

      if (
        handleLaserMove(
          { activeTool, isLasering, containerRef, stageRef, pointerSpaceRef, addLaserPoint, onLaserMove },
          nativeEvt,
          events,
        )
      ) {
        return;
      }

      const pos = getRelativePointerPosition();
      if (!pos) return;

      if (activeTool === 'select') {
        updateMarquee(pos);
        return;
      }

      if (
        handleEraserMove(
          { activeTool, isErasing, eraserCursorPos, setEraserCursorPos, eraseAtPosition },
          pos,
          nativeEvt,
        )
      ) {
        return;
      }

      if (eraserCursorPos) setEraserCursorPos(null);
      if (!isDrawing.current || !activeShapeRef.current) return;

      const adjustingLine = isAdjustingLine();

      let penPoints: { x: number; y: number }[] | undefined;
      if (activeTool === 'pen' && !nativeEvt.shiftKey && !adjustingLine) {
        const space = pointerSpaceFor(pointerSpaceRef, stageRef.current, containerRef.current);
        if (space) {
          penPoints = events.map((ev) =>
            space.transform.point({ x: ev.clientX - space.left, y: ev.clientY - space.top }),
          );
        }
      }

      updateActiveShape(
        {
          activeTool,
          elementsRef,
          activeShapeRef,
          drawLayerRef,
          scale,
          shiftHeld: nativeEvt.shiftKey || adjustingLine,
          penPoints,
        },
        pos,
      );
      if (!adjustingLine) noteStrokeMove(pos);
    },
    [
      isPinching,
      stylusOnly,
      syncStylusButtonsFromEvent,
      stylusPrimaryHeldRef,
      stylusSecondaryHeldRef,
      isStylusActiveRef,
      scale,
      activeTool,
      getRelativePointerPosition,
      updateMarquee,
      setEraserCursorPos,
      eraserCursorPos,
      activePointerIdRef,
      stageRef,
      containerRef,
      pointerSpaceRef,
      isLasering,
      addLaserPoint,
      onLaserMove,
      isErasing,
      eraseAtPosition,
      isDrawing,
      activeShapeRef,
      drawLayerRef,
      elementsRef,
      noteStrokeMove,
      isAdjustingLine,
    ],
  );
}
