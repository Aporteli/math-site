import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import { pointerSpaceFor, type PointerSpace } from '../pointer-space';

export interface HandleLaserMoveContext {
  activeTool: string;
  isLasering: MutableRefObject<boolean>;
  containerRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<Konva.Stage>;
  pointerSpaceRef: MutableRefObject<PointerSpace | null>;
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
    const space = pointerSpaceFor(ctx.pointerSpaceRef, ctx.stageRef.current, ctx.containerRef.current);
    if (!space) return true;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const relPos = space.transform.point({ x: ev.clientX - space.left, y: ev.clientY - space.top });
      ctx.addLaserPoint(relPos);
      if (i === events.length - 1) ctx.onLaserMove?.(relPos);
    }
  }
  return true;
}