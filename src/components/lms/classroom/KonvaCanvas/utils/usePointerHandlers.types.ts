import type { MutableRefObject, RefObject } from 'react';
import Konva from 'konva';
import type { CanvasElement } from './types';

/**
 * Shared context object passed to every pointer-phase hook. This is the same
 * shape that was previously inlined into `usePointerHandlers.ts`.
 */
export interface PointerHandlerContext {
  // props
  activeTool: string;
  strokeColor: string;
  strokeWidth: number;
  stylusOnly: boolean;
  currentFontSize: number;

  // refs
  containerRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<Konva.Stage>;
  drawLayerRef: RefObject<Konva.Layer>;
  elementsRef: MutableRefObject<CanvasElement[]>;
  isDrawing: MutableRefObject<boolean>;
  activeShapeRef: MutableRefObject<any>;
  activeShapeIdRef: MutableRefObject<string>;
  isStylusActiveRef: MutableRefObject<boolean>;
  activePointerIdRef: MutableRefObject<number | null>;
  isPinching: MutableRefObject<boolean>;
  isLasering: MutableRefObject<boolean>;
  isErasing: MutableRefObject<boolean>;
  eraseStrokeDirtyRef: MutableRefObject<boolean>;
  stylusPrimaryHeldRef: MutableRefObject<boolean>;
  stylusSecondaryHeldRef: MutableRefObject<boolean>;

  // state values
  eraserCursorPos: { x: number; y: number } | null;

  // state setters
  setSelectedId: (id: string | null) => void;
  setEraserCursorPos: (pos: { x: number; y: number } | null) => void;

  // callbacks
  getRelativePointerPosition: () => { x: number; y: number } | null;
  finishTextEditing: () => void;
  startTextInlineEditing: (el: CanvasElement) => void;
  startLaserDrawing: (pos: { x: number; y: number }) => void;
  addLaserPoint: (pos: { x: number; y: number }) => void;
  triggerLaserFade: () => void;
  eraseAtPosition: (pos: { x: number; y: number }) => void;
  commitErase: () => void;
  onElementsChange: (elements: CanvasElement[], options?: { commitHistory?: boolean }) => void;
  onLaserMove?: (pos: { x: number; y: number } | null) => void;

  // stylus sync
  syncStylusButtonsFromEvent: (evt: PointerEvent, phase: 'down' | 'move' | 'up' | 'cancel') => void;
}