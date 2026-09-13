import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';

export interface HandleLaserMoveContext {
  activeTool: string;
  isLasering: MutableRefObject<boolean>;
  containerRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<Konva.Stage>;
  addLaserPoint: (pos: { x: number; y: number }) => void;
  onLaserMove?: (pos: { x: number; y: number } | null) => void;
}

/**
 * Feeds every coalesced pointer sample into the laser stroke while the laser
 * tool is active. Returns `true` when the event was handled.
 */
export function handleLaserMove(
  ctx: HandleLaserMoveContext,
  nativeEvt: PointerEvent,
  events: PointerEvent[],
): boolean {
  if (ctx.activeTool !== 'laser') return false;

  if (ctx.isLasering.current || nativeEvt.buttons === 1) {
    const stage = ctx.stageRef.current;
    if (!stage) return true;
    const transform = stage.getAbsoluteTransform().copy().invert();

    for (let i = 0; i < events.length; i++) {
      const cPos = { x: events[i].clientX, y: events[i].clientY };
      const rect = ctx.containerRef.current?.getBoundingClientRect();
      if (rect) {
        const relPos = transform.point({ x: cPos.x - rect.left, y: cPos.y - rect.top });
        ctx.addLaserPoint(relPos);
        if (i === events.length - 1) ctx.onLaserMove?.(relPos);
      }
    }
  }
  return true;
}