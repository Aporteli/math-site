import type { MutableRefObject } from 'react';

export interface HandleEraserDownContext {
  activeTool: string;
  isErasing: MutableRefObject<boolean>;
  eraseStrokeDirtyRef: MutableRefObject<boolean>;
  setEraserCursorPos: (pos: { x: number; y: number } | null) => void;
  eraseAtPosition: (pos: { x: number; y: number }) => void;
}

/** Returns `true` when the event was handled (caller should return). */
export function handleEraserDown(
  ctx: HandleEraserDownContext,
  pos: { x: number; y: number },
): boolean {
  if (ctx.activeTool !== 'eraser') return false;
  ctx.isErasing.current = true;
  ctx.eraseStrokeDirtyRef.current = false;
  ctx.setEraserCursorPos(pos);
  ctx.eraseAtPosition(pos);
  return true;
}