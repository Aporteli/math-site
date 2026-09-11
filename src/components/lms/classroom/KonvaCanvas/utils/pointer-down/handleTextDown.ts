import type { MutableRefObject } from 'react';
import type { CanvasElement } from '../types';

export interface HandleTextDownContext {
  activeTool: string;
  elementsRef: MutableRefObject<CanvasElement[]>;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  setSelectedId: (id: string | null) => void;
  startTextInlineEditing: (el: CanvasElement) => void;
  currentFontSize: number;
  strokeColor: string;
}

/** Returns `true` when the event was handled (caller should return). */
export function handleTextDown(
  ctx: HandleTextDownContext,
  pos: { x: number; y: number },
): boolean {
  if (ctx.activeTool !== 'text') return false;

  const id = `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newElem: CanvasElement = {
    id,
    type: 'text',
    x: pos.x,
    y: pos.y,
    width: 550,
    text: '',
    fontSize: ctx.currentFontSize || 24,
    scaleX: 1,
    scaleY: 1,
    stroke: ctx.strokeColor,
    strokeWidth: 1,
  };
  ctx.elementsRef.current = [...ctx.elementsRef.current, newElem];
  ctx.onElementsChange(ctx.elementsRef.current);
  ctx.setSelectedId(id);
  ctx.startTextInlineEditing(newElem);
  return true;
}