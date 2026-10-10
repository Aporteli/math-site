'use client';

import { PanelLeftOpen } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function OpenMenuButton({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    toggleSidebarDrawer,
  } = model;
  return (
          <button
            type="button"
            onClick={toggleSidebarDrawer}
            title={copy.openMenu}
            aria-label={copy.openMenu}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons shadow-sm transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText">
            <PanelLeftOpen className="size-4" />
          </button>
  );
}
