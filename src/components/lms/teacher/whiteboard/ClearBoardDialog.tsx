'use client';

import { Trash2 } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function ClearBoardDialog({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    clearBoard,
    setIsClearConfirmOpen,
  } = model;
  return (
        <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-80 rounded-box border border-hairline bg-paper p-5 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-box border border-rose-500/20 bg-rose-500/10 text-rose-500">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mb-1 text-sm font-bold text-ink">{copy.clearTitle}</h3>
            <p className="mb-5 text-xs text-muted">{copy.clearMessage}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 cursor-pointer rounded-box border border-hairline bg-surface py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-deep">
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearBoard();
                  setIsClearConfirmOpen(false);
                }}
                className="flex-1 cursor-pointer rounded-box border border-rose-500/30 bg-rose-500/15 py-2 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-500/25">
                {copy.confirmClear}
              </button>
            </div>
          </div>
        </div>
  );
}
