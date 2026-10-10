'use client';

import { Expand, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { ToolButton } from './ToolButton';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function ZoomControls({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    fitToContent,
    isBoardFullscreen,
    toggleBoardFullscreen,
    zoomIn,
    zoomOut,
    zoomReset,
    zoomScale,
  } = model;
  return (
            <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
              <ToolButton title={copy.zoomOut} onClick={zoomOut}>
                <ZoomOut className="size-4" />
              </ToolButton>
              <button
                type="button"
                onClick={zoomReset}
                title={copy.zoomReset}
                className="shrink-0 rounded-box px-1 text-xs font-semibold tabular-nums text-muted hover:text-navy">
                {Math.round(zoomScale * 100)}%
              </button>
              <ToolButton title={copy.zoomIn} onClick={zoomIn}>
                <ZoomIn className="size-4" />
              </ToolButton>
              <ToolButton title={copy.fitToContent} onClick={fitToContent}>
                <Maximize2 className="size-4" />
              </ToolButton>
              <ToolButton
                title={isBoardFullscreen ? 'სრული ეკრანიდან გამოსვლა' : 'სრული ეკრანი'}
                onClick={toggleBoardFullscreen}>
                {isBoardFullscreen ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
              </ToolButton>
            </div>
  );
}
