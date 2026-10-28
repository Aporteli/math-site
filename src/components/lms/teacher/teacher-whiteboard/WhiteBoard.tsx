'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useDashboardFrame } from '@/components/layout/DashboardFrame';
import { WhiteBoardToolBar } from './WhiteBoardToolBar';
import { useWhiteBoard } from './useWhiteBoard';
import type { WhiteboardCopy } from './drawing';

const WhiteBoardCanvas = dynamic(() => import('./WhiteBoardCanvas'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-main" />,
});

export function WhiteBoard({ copy }: { copy: WhiteboardCopy }) {
  const { toggleSidebarDrawer } = useDashboardFrame();
  const board = useWhiteBoard();
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = stageWrapRef.current;
    if (!node) return;

    const updateSize = () => {
      setSize({ width: node.clientWidth, height: node.clientHeight });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <WhiteBoardToolBar
        copy={copy}
        color={board.color}
        strokeWidth={board.strokeWidth}
        saving={board.saving}
        onToggleSidebar={toggleSidebarDrawer}
        onColor={board.setColor}
        onStrokeWidth={board.setStrokeWidth}
        onClear={() => board.setClearOpen(true)}
      />

      <div ref={stageWrapRef} className="relative min-h-0 flex-1 bg-paper">
        {board.loading ? (
          <div className="h-full w-full animate-pulse bg-main" />
        ) : (
          <WhiteBoardCanvas
            width={size.width}
            height={size.height}
            strokes={board.strokes}
            currentStroke={board.currentStroke}
            onPointerDown={board.startStroke}
            onPointerMove={board.extendStroke}
            onPointerUp={board.finishStroke}
          />
        )}
      </div>

      {board.clearOpen ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-box border border-hairline bg-main p-4 shadow-lg">
            <h4 className="text-sm font-bold text-ink">{copy.clearTitle}</h4>
            <p className="mt-2 text-sm text-muted">{copy.clearMessage}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => board.setClearOpen(false)}
                className="rounded-box border border-hairline bg-main px-3 py-1.5 text-xs font-bold text-ink hover:bg-mainButtonHover">
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={board.confirmClear}
                className="rounded-box bg-brass px-3 py-1.5 text-xs font-bold text-paper hover:opacity-90">
                {copy.confirmClear}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
