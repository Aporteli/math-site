'use client';

'use client';

import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';
import { BoardUtilityControls } from './BoardUtilityControls';
import { ColorMenu } from './ColorMenu';
import { EraserToolControl } from './EraserToolControl';
import { LaserControl } from './LaserControl';
import { OpenMenuButton } from './OpenMenuButton';
import { PenToolControl } from './PenToolControl';
import { SelectHandControls } from './SelectHandControls';
import { ShapesMenu } from './ShapesMenu';
import { SmoothControl } from './SmoothControl';
import { StylusControls } from './StylusControls';
import { TextImageTools } from './TextImageTools';
import { UndoRedoControls } from './UndoRedoControls';

export function WhiteboardToolbar({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  return (
    <div className="relative z-30 min-w-0 shrink-0 border-b border-hairline bg-sectionHeader">
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2">
        <OpenMenuButton model={model} copy={copy} />
        <UndoRedoControls model={model} copy={copy} />
        <SelectHandControls model={model} copy={copy} />
        <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
          <PenToolControl model={model} />
          <ColorMenu model={model} />
          <SmoothControl model={model} />
          <EraserToolControl model={model} copy={copy} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
          <ShapesMenu model={model} />
          <TextImageTools model={model} copy={copy} />
        </div>
        <LaserControl model={model} copy={copy} />
        <StylusControls model={model} copy={copy} />
        <BoardUtilityControls model={model} copy={copy} />
      </div>
    </div>
  );
}
