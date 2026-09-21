import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';

interface UseMiddleButtonPanOptions {
  stageRef: RefObject<Konva.Stage | null>;
  setStagePos: (pos: { x: number; y: number }) => void;
  disabled?: boolean;
}

/**
 * Middle-mouse-button pan for the whiteboard stage.
 *
 * Konva's own `draggable` only lets the hand tool pan the stage. This hook
 * lets the middle mouse button pan from ANY tool without touching drawing,
 * selection, erasing or laser logic.
 *
 * Each handler returns `true` when it consumed the event (i.e. a middle
 * pan is in progress) so the caller can bail out of its normal pointer path.
 */
export function useMiddleButtonPan({ stageRef, setStagePos, disabled }: UseMiddleButtonPanOptions) {
  const isPanningRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startStageRef = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: KonvaEventObject<PointerEvent>): boolean => {
      if (disabled) return false;
      if (e.evt.button !== 1) return false;
      const stage = stageRef.current;
      if (!stage) return false;
      const pos = stage.getPointerPosition();
      if (!pos) return false;

      isPanningRef.current = true;
      startPointerRef.current = { x: pos.x, y: pos.y };
      startStageRef.current = { x: stage.x(), y: stage.y() };
      e.evt.preventDefault();
      return true;
    },
    [disabled, stageRef],
  );

  const onPointerMove = useCallback(
    (e: KonvaEventObject<PointerEvent>): boolean => {
      if (!isPanningRef.current) return false;
      const stage = stageRef.current;
      if (!stage) return false;
      const pos = stage.getPointerPosition();
      if (!pos) return false;

      setStagePos({
        x: startStageRef.current.x + (pos.x - startPointerRef.current.x),
        y: startStageRef.current.y + (pos.y - startPointerRef.current.y),
      });
      e.evt.preventDefault();
      return true;
    },
    [stageRef, setStagePos],
  );

  const onPointerUp = useCallback((e: KonvaEventObject<PointerEvent>): boolean => {
    if (!isPanningRef.current) return false;
    isPanningRef.current = false;
    e.evt.preventDefault();
    return true;
  }, []);

  return { isPanningRef, onPointerDown, onPointerMove, onPointerUp };
}