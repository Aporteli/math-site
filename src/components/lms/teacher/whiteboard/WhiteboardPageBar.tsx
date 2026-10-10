'use client';

import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';
import { PageActionControls } from './PageActionControls';
import { PageNavControls } from './PageNavControls';
import { PagesTray } from './PagesTray';
import { ZoomControls } from './ZoomControls';

export function WhiteboardPageBar({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  return (
    <div className="relative z-20 shrink-0 flex w-full min-w-0 flex-col items-center justify-center p-2 bg-paper/30 border-t border-hairline select-none">
      <PagesTray model={model} />
      <div className="w-max max-w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x thin-scrollbar rounded-box border border-hairline bg-sectionHeader shadow-sm">
        <div className="flex w-max items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5">
          <ZoomControls model={model} copy={copy} />
          <PageNavControls model={model} />
          <PageActionControls model={model} />
        </div>
      </div>
    </div>
  );
}
