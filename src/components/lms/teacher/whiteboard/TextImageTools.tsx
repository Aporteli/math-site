'use client';

import { ImageIcon, Type } from 'lucide-react';
import { ToolButton } from './ToolButton';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function TextImageTools({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    activeTool,
    openImagePicker,
    setAndSaveTool,
  } = model;
  return (
    <>
            <ToolButton title={copy.tools.text} active={activeTool === 'text'} onClick={() => setAndSaveTool('text')}>
              <Type className="size-4" />
            </ToolButton>
            <ToolButton title={copy.tools.image} onClick={openImagePicker}>
              <ImageIcon className="size-4" />
            </ToolButton>
    </>
  );
}
