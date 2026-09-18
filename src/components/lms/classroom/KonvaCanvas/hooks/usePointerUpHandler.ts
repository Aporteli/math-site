import { useCallback } from 'react';
import type { PointerHandlerContext } from '../utils/usePointerHandlers.types';
import { stylusUpPhase } from '../utils/pointer-up/stylusUpPhase';
import { releasePointerOwnership } from '../utils/pointer-up/releasePointerOwnership';
import { handleLaserUp } from '../utils/pointer-up/handleLaserUp';
import { handleEraserUp } from '../utils/pointer-up/handleEraserUp';
import { buildElementFromShape } from '../utils/pointer-up/buildElementFromShape';
import { commitShape } from '../utils/pointer-up/commitShape';
import {
  findMergeCandidate,
  mergeStrokes,
} from '../utils/pointer-up/mergeNearbyStrokes';
import { findNearbyEndpoint } from '../utils/snapping/endpoints';

export function usePointerUpHandler(ctx: PointerHandlerContext) {
  const {
    activeTool,
    strokeColor,
    strokeWidth,
    scale,
    elementsRef,
    isDrawing,
    activeShapeRef,
    activeShapeIdRef,
    isStylusActiveRef,
    activePointerIdRef,
    isLasering,
    triggerLaserFade,
    commitErase,
    endMarquee,
    onElementsChange,
    onLaserMove,
    syncStylusButtonsFromEvent,
    cancelHoldToSnap,
  } = ctx;

  return useCallback(
    (e: any) => {
      cancelHoldToSnap();

      const evt = e.evt as PointerEvent;

      if (stylusUpPhase({ isStylusActiveRef, syncStylusButtonsFromEvent }, evt)) {
        return;
      }

      releasePointerOwnership({ activePointerIdRef, isStylusActiveRef }, evt);

      if (activeTool === 'select') {
        endMarquee();
        return;
      }
      if (handleLaserUp({ activeTool, isLasering, triggerLaserFade, onLaserMove })) return;
      if (handleEraserUp({ activeTool, commitErase })) return;

      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (!activeShapeRef.current) return;

      const newElem = buildElementFromShape({
        activeTool,
        activeShapeId: activeShapeIdRef.current,
        shape: activeShapeRef.current,
        strokeColor,
        strokeWidth,
        scale,
      });

      activeShapeRef.current = null;

      if (!newElem) return;

      const isLineDrawMode =
        (activeTool === 'pen' && evt.shiftKey) || activeTool === 'line';

      if (isLineDrawMode && newElem.points && newElem.points.length >= 4) {
        const pts = newElem.points.slice();
        const n = pts.length;

        // Snap start (both endpoints + interior vertices now considered)
        const startHit = findNearbyEndpoint(
          { x: pts[0], y: pts[1] },
          elementsRef.current,
          scale,
        );
        if (startHit) {
          pts[0] = startHit.x;
          pts[1] = startHit.y;
        }

        // Snap end
        const endHit = findNearbyEndpoint(
          { x: pts[n - 2], y: pts[n - 1] },
          elementsRef.current,
          scale,
        );
        if (endHit) {
          pts[n - 2] = endHit.x;
          pts[n - 1] = endHit.y;
        }

        newElem.points = pts;

        const cand = findMergeCandidate(newElem, elementsRef.current, scale);
        if (cand) {
          const merged = mergeStrokes(cand.target, newElem, cand.mode);
          onElementsChange(
            elementsRef.current.map((el) =>
              el.id === cand.target.id ? merged : el,
            ),
          );
          return;
        }
      }

      commitShape({ elementsRef, onElementsChange }, newElem);
    },
    [
      syncStylusButtonsFromEvent,
      cancelHoldToSnap,
      activePointerIdRef,
      isStylusActiveRef,
      activeTool,
      isLasering,
      triggerLaserFade,
      onLaserMove,
      commitErase,
      endMarquee,
      isDrawing,
      activeShapeRef,
      activeShapeIdRef,
      strokeColor,
      strokeWidth,
      scale,
      elementsRef,
      onElementsChange,
    ],
  );
}