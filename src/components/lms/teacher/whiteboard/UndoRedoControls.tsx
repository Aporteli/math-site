'use client';

import { Redo2, Undo2 } from 'lucide-react';
import { ToolButton } from './ToolButton';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function UndoRedoControls({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    canRedo,
    canUndo,
    redo,
    undo,
  } = model;
  return (
          <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
            <ToolButton title={copy.undo} onClick={undo} disabled={!canUndo}>
              <Undo2 className="size-4" />
            </ToolButton>
            <ToolButton title={copy.redo} onClick={redo} disabled={!canRedo}>
              <Redo2 className="size-4" />
            </ToolButton>
          </div>
  );
}
