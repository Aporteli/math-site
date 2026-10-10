'use client';

import { ChevronLeft, ChevronRight, Plus, Layers } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function PageNavControls({ model }: { model: TeacherWhiteboardModel }) {
  const {
    currentPageIndex,
    handleAddNewPage,
    handleSwitchPage,
    isPagesTrayOpen,
    pages,
    setIsPagesTrayOpen,
  } = model;
  return (
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 border-r border-hairline pr-1.5">
              <button
                type="button"
                onClick={() => handleSwitchPage(currentPageIndex - 1)}
                disabled={currentPageIndex === 0}
                className="flex size-7 sm:size-8 items-center justify-center rounded-box bg-paper hover:bg-paper-deep disabled:opacity-40 text-ink transition-colors">
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                data-tray-trigger
                onClick={() => setIsPagesTrayOpen((prev) => !prev)}
                title="ყველა დაფის ნახვა"
                className={`flex items-center gap-1 rounded-box px-2.5 py-1 text-xs font-bold transition-all sm:gap-1.5 ${isPagesTrayOpen ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : 'text-ink hover:bg-sectionHeader'}`}>
                <Layers className="size-3.5" />
                <span>
                  {currentPageIndex + 1} / {pages.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPage(currentPageIndex + 1)}
                disabled={currentPageIndex === pages.length - 1}
                className="flex size-7 sm:size-8 items-center justify-center rounded-box bg-paper hover:bg-paper-deep disabled:opacity-40 text-ink transition-colors">
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleAddNewPage}
                className="flex items-center gap-1.5 h-7 sm:h-8 px-2.5 rounded-box bg-paper hover:bg-paper-deep text-ink text-xs font-medium transition-colors">
                <Plus className="size-3.5" />
                <span>ახალი</span>
              </button>
            </div>
  );
}
