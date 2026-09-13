import type { MutableRefObject } from 'react';

export interface HandleLaserDownContext {
  activeTool: string;
  isLasering: MutableRefObject<boolean>;
  startLaserDrawing: (pos: { x: number; y: number }) => void;
  onLaserMove?: (pos: { x: number; y: number } | null) => void;
}

/** Returns `true` when the event was handled (caller should return). */
export function handleLaserDown(
  ctx: HandleLaserDownContext,
  pos: { x: number; y: number },
): boolean {
  if (ctx.activeTool !== 'laser') return false;
  ctx.isLasering.current = true;
  ctx.startLaserDrawing(pos);
  ctx.onLaserMove?.(pos);
  return true;
}