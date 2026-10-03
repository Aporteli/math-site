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
  disabled?: boolean;
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
  disabled = false,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-r border-hairline pr-1.5 sm:gap-1.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled || currentPageIndex === 0}
        className="flex size-7 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-mainText transition-all duration-200 hover:bg-mainButtonHover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:size-8">
        <ChevronLeft className="size-4" />
      </button>

      <button
        type="button"
        data-tray-trigger
        onClick={onToggleTray}
        disabled={disabled}
        title="ყველა დაფის ნახვა"
        className={`flex cursor-pointer items-center gap-1 rounded-box px-2 py-1 text-xs font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 sm:gap-1.5 sm:px-2.5 ${
          isPagesTrayOpen
            ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
            : 'text-mainText hover:bg-mainButtonHover'
        }`}>
        <Layers className="size-3.5 text-navy" />
        <span>
          {currentPageIndex + 1} / {pagesLength}
        </span>
        {selectedPagesCount > 0 && (
          <span className="ml-1 rounded-box bg-[#465D73] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {selectedPagesCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={disabled || currentPageIndex === pagesLength - 1}
        className="flex size-7 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-mainText transition-all duration-200 hover:bg-mainButtonHover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:size-8">
        <ChevronRight className="size-4" />
      </button>

      {isTeacher && (
        <button
          type="button"
          onClick={onAddNewPage}
          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-box bg-[#465D73] px-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] sm:h-8 sm:gap-1.5 sm:px-2.5">
          <Plus className="size-3.5" />
          <span>ახალი</span>
        </button>
      )}
    </div>
  );
}
