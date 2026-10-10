'use client';

import type { RefObject } from 'react';
import type { CanvasElement, KonvaCanvasHandle, KonvaCanvasProps } from '../../KonvaCanvas/utils/types';
import { KonvaCanvas } from './KonvaCanvasDynamic';

interface Props {
  boardViewportRef: RefObject<HTMLDivElement | null>;
  isDark: boolean;
  isTeacher: boolean;
  assignedPageIndex: number | null;
  canvasRef: RefObject<KonvaCanvasHandle | null>;
  currentPageIndex: number;
  pages: CanvasElement[][];
  onElementsChange: KonvaCanvasProps['onElementsChange'];
  activeTool: KonvaCanvasProps['activeTool'];
  selectionMode: NonNullable<KonvaCanvasProps['selectionMode']>;
  strokeColor: string;
  strokeWidth: number;
  eraserWidth: number;
  scale: number;
  stagePos: { x: number; y: number };
  onStagePosChange: (pos: { x: number; y: number }) => void;
  disabled: boolean;
  onLaserMove: (pos: { x: number; y: number } | null) => void;
  stylusOnly: boolean;
  onStylusButtonAction: NonNullable<KonvaCanvasProps['onStylusButtonAction']>;
}

export function BoardStage({
  boardViewportRef,
  isDark,
  isTeacher,
  assignedPageIndex,
  canvasRef,
  currentPageIndex,
  pages,
  onElementsChange,
  activeTool,
  selectionMode,
  strokeColor,
  strokeWidth,
  eraserWidth,
  scale,
  stagePos,
  onStagePosChange,
  disabled,
  onLaserMove,
  stylusOnly,
  onStylusButtonAction,
}: Props) {
  const pageLocked = !isTeacher && assignedPageIndex !== null;

  return (
    <div
      ref={boardViewportRef}
      className="relative flex-1 w-full min-h-0 min-w-0 overflow-hidden"
      style={{ backgroundColor: isDark ? '#020617' : '#ffffff' }}>
      {pageLocked && (
        <div className="pointer-events-none absolute top-2 left-2 z-10 rounded-box bg-[#465D73] px-2 py-1 text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          დაფა {assignedPageIndex + 1}
        </div>
      )}
      <KonvaCanvas
        ref={canvasRef}
        key={currentPageIndex}
        elements={pages[currentPageIndex] || []}
        onElementsChange={onElementsChange}
        activeTool={activeTool}
        selectionMode={selectionMode}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        eraserWidth={eraserWidth}
        isDark={isDark}
        scale={scale}
        stagePos={stagePos}
        onStagePosChange={onStagePosChange}
        disabled={disabled}
        onLaserMove={onLaserMove}
        stylusOnly={stylusOnly}
        onStylusButtonAction={onStylusButtonAction}
      />
    </div>
  );
}
