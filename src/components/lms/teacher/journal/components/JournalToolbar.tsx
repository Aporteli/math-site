'use client';

import { ChevronLeft, ChevronRight, PanelLeftOpen, Plus } from 'lucide-react';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import { JournalViewMenu } from './JournalViewMenu';
import type { ViewMode } from '../types';

interface JournalToolbarProps {
  onToggleSidebar: () => void;
  headerTitle: string | undefined;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  view: ViewMode;
  viewMenuOpen: boolean;
  setView: Dispatch<SetStateAction<ViewMode>>;
  setViewMenuOpen: Dispatch<SetStateAction<boolean>>;
  onAdd: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function JournalToolbar({
  onToggleSidebar,
  headerTitle,
  onToday,
  onPrev,
  onNext,
  view,
  viewMenuOpen,
  setView,
  setViewMenuOpen,
  onAdd,
}: JournalToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-hairline bg-sectionHeader px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          title="მენიუს გახსნა"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons shadow-sm transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98]">
          <PanelLeftOpen className="size-4" />
        </button>

        <div>
          <h3 className="text-base font-bold text-ink leading-tight">ჟურნალი</h3>
          <p className="text-xs text-muted capitalize">{headerTitle}</p>
        </div>
      </div>

      <div className="flex h-9 items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-9 cursor-pointer items-center rounded-box border border-hairline bg-main px-3 text-xs font-bold text-ink shadow-sm transition-all duration-200 hover:bg-mainButtonHover active:scale-[0.98]">
          დღეს
        </button>

        <div className="flex h-9 items-center overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
          <button
            type="button"
            onClick={onPrev}
            className="flex h-9 w-8 cursor-pointer items-center justify-center text-icons transition-colors hover:bg-mainButtonHover hover:text-mainText">
            <ChevronLeft className="size-4 text-brass-strong" />
          </button>
          <div className="h-4 w-px bg-hairline" />
          <button
            type="button"
            onClick={onNext}
            className="flex h-9 w-8 cursor-pointer items-center justify-center text-icons transition-colors hover:bg-mainButtonHover hover:text-mainText">
            <ChevronRight className="size-4 text-brass-strong " />
          </button>
        </div>

        <JournalViewMenu
          view={view}
          viewMenuOpen={viewMenuOpen}
          setView={setView}
          setViewMenuOpen={setViewMenuOpen}
        />

        <button
          type="button"
          onClick={onAdd}
          className="ml-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-box bg-[#465D73] px-3.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
          <Plus className="size-3.5" />
          <span className="hidden md:inline text-xs">ღონისძიება</span>
        </button>
      </div>
    </div>
  );
}
