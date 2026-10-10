'use client';

import { Crosshair } from 'lucide-react';
import { ToolButton } from './ToolButton';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function LaserControl({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    activeTool,
    setAndSaveTool,
  } = model;
  return (
          <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
            <ToolButton
              title={copy.tools.laser}
              active={activeTool === 'laser'}
              onClick={() => setAndSaveTool('laser')}>
              <Crosshair className="size-4" />
            </ToolButton>
          </div>
  );
}
