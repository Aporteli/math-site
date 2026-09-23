'use client';

import { forwardRef } from 'react';
import { Layers, Plus, Trash2, X } from 'lucide-react';
import { BoardThumbnail } from './BoardThumbnail';
import type { CanvasElement } from '../../KonvaCanvas/utils/types';

interface Props {
  pages: CanvasElement[][];
  currentPageIndex: number;
  selectedPages: number[];
  isDark: boolean;
  onClose: () => void;
  onSelectAll: () => void;
  onSwitchPage: (idx: number) => void;
  onTogglePageSelect: (idx: number) => void;
  onDeletePage: (idx: number) => void;
  onDeleteSelectedPages: () => void;
  onAddNewPage: () => void;
  assignedNames?: string[][];
}

export const PagesTray = forwardRef<HTMLDivElement, Props>(function PagesTray(
  {pages, currentPageIndex, selectedPages, isDark, onClose, onSelectAll, onSwitchPage, onTogglePageSelect, onDeletePage, onDeleteSelectedPages, onAddNewPage, assignedNames },
  ref,
) {
  return (
    <div
      ref={ref}
      className="absolute bottom-14 inset-x-1 sm:inset-x-auto w-auto max-w-[calc(100%-0.5rem)] sm:max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 z-[120]">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-1">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            დაფის გვერდები ({pages.length})
          </span>
          {pages.length > 1 && (
            <button type="button" onClick={onSelectAll} className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-2">
              {selectedPages.length === pages.length ? 'მონიშვნის მოხსნა' : 'ყველას მონიშვნა'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedPages.length > 0 && (
            <button
              type="button"
              onClick={onDeleteSelectedPages}
              className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-2 py-1 text-[11px] font-bold text-white shadow-xs transition-colors">
              <Trash2 className="size-3.5" />
              წაშლა ({selectedPages.length})
            </button>
          )}
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-1 px-1 custom-scrollbar">
        {pages.map((pageElems, idx) => (
          <div key={idx} className="flex shrink-0 flex-col items-center gap-1">
          <BoardThumbnail
            pageIndex={idx}
            elements={pageElems}
            isActive={currentPageIndex === idx}
            isSelected={selectedPages.includes(idx)}
            isDark={isDark}
            onClick={() => onSwitchPage(idx)}
            onLongPress={() => onTogglePageSelect(idx)}
            onDelete={() => onDeletePage(idx)}
            canDelete={pages.length > 1}
          />
          {assignedNames?.[idx] && assignedNames[idx].length > 0 && (
            <p className="max-w-24 truncate text-[10px] font-medium text-indigo-600 dark:text-indigo-300" title={assignedNames[idx].join(', ')}>
              {assignedNames[idx].join(', ')}
            </p>
          )}
          </div>
        ))}

        <button
          type="button"
          onClick={onAddNewPage}
          className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shrink-0 cursor-pointer">
          <Plus className="size-5" />
          <span className="text-[11px] font-bold">ახალი დაფა</span>
        </button>
      </div>
    </div>
  );
});