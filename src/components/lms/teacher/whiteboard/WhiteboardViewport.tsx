'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

const KonvaCanvas = dynamic(() => import('@/components/lms/classroom/KonvaCanvas/KonvaCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <Loader2 className="size-8 animate-spin text-muted" />
    </div>
  ),
});

export function WhiteboardViewport({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    activeTool,
    addImage,
    applyStylusAction,
    boardViewportRef,
    canvasRef,
    currentPageIndex,
    effectiveStroke,
    eraserWidth,
    fitScale,
    handleElementsChange,
    handleLaserMove,
    handleLiveStroke,
    isDark,
    pages,
    penSmoothEnabled,
    penSmoothIntensity,
    selectMode,
    setStagePos,
    stagePos,
    strokeWidth,
    stylusOnly,
    zoomScale,
  } = model;
  return (
      <div
        ref={boardViewportRef}
        className="relative flex-1 w-full min-h-0 min-w-0 overflow-hidden touch-none select-none"
        style={{ backgroundColor: isDark ? '#020617' : '#ffffff' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) addImage(ev.target.result as string);
            };
            reader.readAsDataURL(file);
          }
        }}>
        <KonvaCanvas
          ref={canvasRef}
          elements={pages[currentPageIndex] || []}
          onElementsChange={handleElementsChange}
          activeTool={activeTool}
          selectionMode={selectMode}
          strokeColor={effectiveStroke}
          strokeWidth={strokeWidth}
          eraserWidth={eraserWidth}
          isDark={isDark}
          scale={zoomScale * fitScale}
          stagePos={stagePos}
          onStagePosChange={setStagePos}
          textPlaceholder={copy.textPlaceholder}
          onPasteImage={addImage}
          stylusOnly={stylusOnly}
          onStylusButtonAction={applyStylusAction}
          penSmoothIntensity={penSmoothEnabled ? penSmoothIntensity : 0}
          onLaserMove={handleLaserMove}
          onLiveStroke={handleLiveStroke}
        />
      </div>
  );
}
