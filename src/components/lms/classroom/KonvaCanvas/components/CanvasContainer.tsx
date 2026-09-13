import React from 'react';
import type { RefObject } from 'react';

function getCursorClass(activeTool: string) {
  if (activeTool === 'hand') return 'cursor-grab active:cursor-grabbing';
  if (activeTool === 'eraser') return 'cursor-none';
  if (activeTool === 'laser') return 'cursor-crosshair active:cursor-none';
  return 'cursor-crosshair';
}

interface CanvasContainerProps {
  containerRef: RefObject<HTMLDivElement>;
  activeTool: string;
  children: React.ReactNode;
}

export function CanvasContainer({ containerRef, activeTool, children }: CanvasContainerProps) {
  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative inset-0 overflow-hidden select-none touch-none ${getCursorClass(activeTool)}`}
      onContextMenu={(e) => e.preventDefault()}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@700&display=swap');
      `}</style>
      {children}
    </div>
  );
}