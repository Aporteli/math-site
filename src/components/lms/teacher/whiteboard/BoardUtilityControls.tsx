'use client';

import { Download, Moon, Sun, Trash2 } from 'lucide-react';
import { ToolButton } from './ToolButton';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function BoardUtilityControls({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    exportPng,
    isDark,
    setIsClearConfirmOpen,
    toggleAndSaveTheme,
  } = model;
  return (
          <div className="flex shrink-0 items-center gap-0.5">
            <ToolButton title={isDark ? copy.lightMode : copy.darkMode} onClick={toggleAndSaveTheme}>
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
            </ToolButton>
            <ToolButton title={copy.export} onClick={exportPng}>
              <Download className="size-4" />
            </ToolButton>
            <button
              type="button"
              title={copy.clear}
              aria-label={copy.clear}
              onClick={() => setIsClearConfirmOpen(true)}
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box text-body transition-colors hover:bg-rose-500/15 hover:text-rose-500">
              <Trash2 className="size-4" />
            </button>
          </div>
  );
}
