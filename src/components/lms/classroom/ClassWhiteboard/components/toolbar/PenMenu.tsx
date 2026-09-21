'use client';

import type { RefObject } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';

interface Props {
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activeTool: any;
  setActiveTool: (t: any) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  closeOtherMenus: () => void;
}

export function PenMenu({
  menuRef, isOpen, setIsOpen, activeTool, setActiveTool, strokeWidth, setStrokeWidth, closeOtherMenus,
}: Props) {
  return (
    <div ref={menuRef} className="relative flex shrink-0 items-center">
      <div className={`flex items-center h-7 sm:h-8 rounded-xl transition-all shadow-xs ${
        activeTool === 'pen'
          ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20'
          : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
      }`}>
        <button
          type="button"
          title="კალამი"
          onClick={() => { setActiveTool('pen'); setIsOpen(false); closeOtherMenus(); }}
          className="flex items-center gap-1 h-full px-2 rounded-l-xl focus:outline-none">
          <Pencil className="size-3.5 sm:size-4" />
          <span className="text-[10px] sm:text-[11px] font-mono font-medium opacity-90">{strokeWidth}px</span>
        </button>

        <button
          type="button"
          title="სისქის მენიუ"
          onClick={() => { setIsOpen(!isOpen); closeOtherMenus(); }}
          className={`flex items-center justify-center px-1 h-full rounded-r-xl transition-colors border-l ${
            activeTool === 'pen'
              ? 'border-indigo-500/40 hover:bg-indigo-700'
              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}>
          <ChevronDown className={`size-2.5 sm:size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-[120] w-52 sm:w-56 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">კალმის სისქე</span>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{strokeWidth}px</span>
          </div>

          <input
            type="range"
            min="0.5"
            max="24"
            step="0.5"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {[1, 2, 4, 8, 14].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setStrokeWidth(size)}
                className={`size-6 sm:size-7 flex items-center justify-center rounded-xl transition-colors ${
                  strokeWidth === size
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 ring-1 ring-indigo-500'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                }`}>
                <div className="rounded-full bg-current" style={{ width: Math.min(14, size + 2), height: Math.min(14, size + 2) }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}