'use client';

import type { RefObject } from 'react';
import { ChevronDown } from 'lucide-react';
import { WHITEBOARD_COLORS } from '../../constants/colors';

interface Props {
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  effectiveStroke: string;
  closeOtherMenus: () => void;
}

export function ColorMenu({
  menuRef, isOpen, setIsOpen, strokeColor, setStrokeColor, effectiveStroke, closeOtherMenus,
}: Props) {
  return (
    <div ref={menuRef} className="relative flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); closeOtherMenus(); }}
        title="ფერის არჩევა"
        className="flex items-center gap-1 h-7 sm:h-8 px-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700/60">
        <div className="size-4 sm:size-4.5 rounded-full border border-black/10 dark:border-white/20 shadow-2xs" style={{ backgroundColor: effectiveStroke }} />
        <ChevronDown className={`size-2.5 sm:size-3 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-[120] w-max rounded-2xl bg-white dark:bg-slate-900 p-2.5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2">
            {WHITEBOARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStrokeColor(c)}
                className={`size-6 rounded-full transition-transform ${
                  strokeColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}