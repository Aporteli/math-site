'use client';

import { ChevronLeft, ChevronRight, Layers, Plus } from 'lucide-react';

interface Props {
  isTeacher: boolean;
  currentPageIndex: number;
  pagesLength: number;
  selectedPagesCount: number;
  isPagesTrayOpen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleTray: () => void;
  onAddNewPage: () => void;
}

export function PageNavigation({
  isTeacher,
  currentPageIndex,
  pagesLength,
  selectedPagesCount,
  isPagesTrayOpen,
  onPrev,
  onNext,
  onToggleTray,
  onAddNewPage,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPageIndex === 0}
        className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors">
        <ChevronLeft className="size-4" />
      </button>

      <button
        type="button"
        data-tray-trigger
        onClick={onToggleTray}
        title="ყველა დაფის ნახვა"
        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
          isPagesTrayOpen
            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
        }`}>
        <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>
          {currentPageIndex + 1} / {pagesLength}
        </span>
        {selectedPagesCount > 0 && (
          <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
            {selectedPagesCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={currentPageIndex === pagesLength - 1}
        className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors">
        <ChevronRight className="size-4" />
      </button>

      {isTeacher && (
        <button
          type="button"
          onClick={onAddNewPage}
          className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors">
          <Plus className="size-3.5" />
          <span>ახალი</span>
        </button>
      )}
    </div>
  );
}
