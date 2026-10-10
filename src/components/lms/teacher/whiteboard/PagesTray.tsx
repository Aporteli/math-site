'use client';

import { Plus, X, Layers } from 'lucide-react';
import { BoardThumbnail } from './BoardThumbnail';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function PagesTray({ model }: { model: TeacherWhiteboardModel }) {
  const {
    currentPageIndex,
    handleAddNewPage,
    handleDeletePage,
    handleSwitchPage,
    isDark,
    isPagesTrayOpen,
    pages,
    pagesTrayRef,
    setIsPagesTrayOpen,
  } = model;
  if (!isPagesTrayOpen) return null;
  return (
          <div
            ref={pagesTrayRef}
            className="absolute bottom-14 z-30 w-auto max-w-[calc(100%-1rem)] animate-in rounded-box border border-hairline bg-main/95 p-3 shadow-2xl backdrop-blur-md fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 inset-x-2 sm:inset-x-auto sm:max-w-2xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline px-1">
              <div className="flex items-center gap-2">
                <Layers className="size-3" strokeWidth={2} />
                <span className="text-xs font-bold text-ink">დაფის გვერდები ({pages.length})</span>
              </div>
              <button type="button" onClick={() => setIsPagesTrayOpen(false)} className="text-muted hover:text-loss cursor-pointer transition-colors">
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-1 px-1 custom-scrollbar">
              {pages.map((pageElems, idx) => (
                <BoardThumbnail
                  key={idx}
                  pageIndex={idx}
                  elements={pageElems}
                  isActive={currentPageIndex === idx}
                  isDark={isDark}
                  onClick={() => handleSwitchPage(idx)}
                  onDelete={() => handleDeletePage(idx)}
                  canDelete={pages.length > 1}
                />
              ))}
              <button
                type="button"
                onClick={handleAddNewPage}
                className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-box border-2 border-dashed border-hairline text-muted transition-all hover:border-navy hover:bg-sectionHeader hover:text-navy">
                <Plus className="size-5" />
                <span className="text-[11px] font-bold">ახალი დაფა</span>
              </button>
            </div>
          </div>
  );
}
