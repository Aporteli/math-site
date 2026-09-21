import type { MutableRefObject } from 'react';

export interface HandleLaserUpContext {
  activeTool: string;
  isLasering: MutableRefObject<boolean>;
  triggerLaserFade: () => void;
  onLaserMove?: (pos: { x: number; y: number } | null) => void;
}

/** Returns `true` when the event was handled (caller should return). */
export function handleLaserUp(ctx: HandleLaserUpContext): boolean {
  if (ctx.activeTool !== 'laser') return false;
  ctx.isLasering.current = false;
  ctx.triggerLaserFade();
  ctx.onLaserMove?.(null);
  return true;
}