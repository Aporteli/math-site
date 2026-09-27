import { useCallback } from 'react';
import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import { stylusMovePhase } from '../utils/pointer-move/stylusMovePhase';
import { updateEraserHover } from '../utils/pointer-move/updateEraserHover';
import { handleLaserMove } from '../utils/pointer-move/handleLaserMove';
import { handleEraserMove } from '../utils/pointer-move/handleEraserMove';
import { updateActiveShape } from '../utils/pointer-move/updateActiveShape';

export function usePointerMoveHandler(ctx: PointerHandlerContext) {
  const {
    scale,
    activeTool,
    stylusOnly,
    containerRef,
    stageRef,
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
          { activeTool, isLasering, containerRef, stageRef, addLaserPoint, onLaserMove },
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

      let penPoints: { x: number; y: number }[] | undefined;
      if (activeTool === 'pen' && !nativeEvt.shiftKey) {
        const stage = stageRef.current;
        const rect = containerRef.current?.getBoundingClientRect();
        if (stage && rect) {
          const transform = stage.getAbsoluteTransform().copy().invert();
          penPoints = events.map((ev) =>
            transform.point({ x: ev.clientX - rect.left, y: ev.clientY - rect.top }),
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
          shiftHeld: nativeEvt.shiftKey,
          penPoints,
        },
        pos,
      );
      noteStrokeMove(pos);
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
    ],
  );
}
