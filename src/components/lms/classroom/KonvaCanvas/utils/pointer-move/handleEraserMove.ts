import type { MutableRefObject } from 'react';

export interface HandleEraserMoveContext {
  activeTool: string;
  isErasing: MutableRefObject<boolean>;
  eraserCursorPos: { x: number; y: number } | null;
  setEraserCursorPos: (pos: { x: number; y: number } | null) => void;
  eraseAtPosition: (pos: { x: number; y: number }) => void;
}

/**
 * Updates the eraser cursor and erases along the current pointer position while
 * the eraser tool is active. Returns `true` when the event was handled.
 */
export function handleEraserMove(
  ctx: HandleEraserMoveContext,
  pos: { x: number; y: number },
  nativeEvt: PointerEvent,
): boolean {
  if (ctx.activeTool !== 'eraser') return false;

  ctx.setEraserCursorPos(pos);
  if (ctx.isErasing.current || nativeEvt.buttons === 1) {
    ctx.eraseAtPosition(pos);
  }
  return true;
}