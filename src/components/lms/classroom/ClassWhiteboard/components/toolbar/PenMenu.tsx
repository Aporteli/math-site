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
  menuRef,
  isOpen,
  setIsOpen,
  setActiveTool,
  strokeWidth,
  setStrokeWidth,
  closeOtherMenus,
}: Props) {
  return (
    <div ref={menuRef} data-toolbar-key="pen" className="relative flex shrink-0 items-center">
      <div className="flex h-7 items-center text-mainText transition-all sm:h-8">
        <button
          type="button"
          title="კალამი"
          onClick={() => {
            setActiveTool('pen');
            setIsOpen(false);
            closeOtherMenus();
          }}
          className="flex h-full cursor-pointer items-center gap-1 rounded-box px-2 hover:bg-mainButtonHover hover:text-mainText focus:outline-none">
          <Pencil className="size-3.5 sm:size-4" />
          <span className="font-mono text-[11px] font-medium opacity-90">{strokeWidth}px</span>
        </button>

        <button
          type="button"
          title="სისქის მენიუ"
          onClick={() => {
            setIsOpen(!isOpen);
            closeOtherMenus();
          }}
          className="flex h-full cursor-pointer items-center justify-center border-l border-hairline px-1 transition-colors duration-200 hover:bg-mainButtonHover hover:text-mainText">
          <ChevronDown
            className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-[120] mt-2 w-52 animate-in rounded-box border border-hairline bg-main p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 duration-150 sm:w-56">
          <div className="mb-2 flex items-center justify-between border-b border-hairline pb-2">
            <span className="text-xs font-bold text-mainText">კალმის სისქე</span>
            <span className="font-mono text-xs font-bold text-navy">{strokeWidth}px</span>
          </div>

          <input
            type="range"
            min="0.5"
            max="24"
            step="0.5"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-box bg-paper-deep accent-[#465D73]"
          />

          <div className="mt-2.5 flex items-center justify-between border-t border-hairline pt-2">
            {[1, 2, 4, 8, 14].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setStrokeWidth(size)}
                className={`flex size-6 cursor-pointer items-center justify-center rounded-box transition-colors sm:size-7 ${
                  strokeWidth === size
                    ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]'
                    : 'text-mainText hover:bg-sectionHeader hover:text-mainText'
                }`}>
                <div
                  className="rounded-box bg-current"
                  style={{ width: Math.min(14, size + 2), height: Math.min(14, size + 2) }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
