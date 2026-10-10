'use client';

import { Check, ChevronDown } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { ViewMode } from '../types';

interface JournalViewMenuProps {
  view: ViewMode;
  viewMenuOpen: boolean;
  setView: Dispatch<SetStateAction<ViewMode>>;
  setViewMenuOpen: Dispatch<SetStateAction<boolean>>;
}

export function JournalViewMenu({ view, viewMenuOpen, setView, setViewMenuOpen }: JournalViewMenuProps) {
  return (
    <div className="relative h-9">
      <button
        type="button"
        onClick={() => setViewMenuOpen(!viewMenuOpen)}
        className="inline-flex h-9 min-w-[100px] cursor-pointer items-center justify-between gap-2 rounded-box border border-hairline bg-main px-3 text-xs font-bold text-ink shadow-sm transition-all duration-200 hover:bg-mainButtonHover focus:outline-none active:scale-[0.98]">
        <span>
          {view === 'day' && 'დღე'}
          {view === 'week' && 'კვირა'}
          {view === 'month' && 'თვე'}
          {view === 'schedule' && 'განრიგი'}
        </span>
        <ChevronDown
          className={`size-3.5 text-mainText transition-transform duration-200 ${viewMenuOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {viewMenuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setViewMenuOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1.5 w-36 overflow-hidden rounded-box border border-hairline bg-main p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-in fade-in zoom-in-95 duration-100">
            {(['day', 'week', 'month', 'schedule'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  setViewMenuOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-box px-2.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                  view === v
                    ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                    : 'text-ink hover:bg-sectionHeader'
                }`}>
                {v === 'day' && 'დღე'}
                {v === 'week' && 'კვირა'}
                {v === 'month' && 'თვე'}
                {v === 'schedule' && 'განრიგი'}
                {view === v && <Check className="size-3 text-brass-strong" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
