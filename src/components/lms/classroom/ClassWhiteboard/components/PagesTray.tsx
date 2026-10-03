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
      className="absolute inset-x-1 bottom-14 z-[120] w-auto max-w-[calc(100%-0.5rem)] animate-in rounded-box border border-hairline bg-sectionHeader p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 sm:inset-x-auto sm:max-w-2xl">
      <div className="mb-2 flex items-center justify-between border-b border-hairline px-1 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-navy" />
          <span className="text-xs font-bold text-mainText">
            დაფის გვერდები ({pages.length})
          </span>
          {pages.length > 1 && (
            <button type="button" onClick={onSelectAll} className="ml-2 cursor-pointer text-[11px] font-bold text-navy hover:underline">
              {selectedPages.length === pages.length ? 'მონიშვნის მოხსნა' : 'ყველას მონიშვნა'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedPages.length > 0 && (
            <button
              type="button"
              onClick={onDeleteSelectedPages}
              className="inline-flex cursor-pointer items-center gap-1 rounded-box border border-rose-500/30 bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-500 transition-colors hover:bg-rose-500/25">
              <Trash2 className="size-3.5" />
              წაშლა ({selectedPages.length})
            </button>
          )}
          <button type="button" onClick={onClose} className="cursor-pointer text-muted transition-colors hover:text-mainText">
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
            <p className="max-w-24 truncate text-[10px] font-bold text-navy" title={assignedNames[idx].join(', ')}>
              {assignedNames[idx].join(', ')}
            </p>
          )}
          </div>
        ))}

        <button
          type="button"
          onClick={onAddNewPage}
          className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-box border-2 border-dashed border-hairline text-muted transition-all duration-200 hover:border-navy hover:bg-navy-tint hover:text-navy">
          <Plus className="size-5" />
          <span className="text-[11px] font-bold">ახალი დაფა</span>
        </button>
      </div>
    </div>
  );
});