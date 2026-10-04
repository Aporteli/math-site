'use client';

import type { RefObject } from 'react';
import { ChevronDown, Eraser } from 'lucide-react';

interface Props {
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activeTool: any;
  setActiveTool: (t: any) => void;
  eraserWidth: number;
  setEraserWidth: (w: number) => void;
  closeOtherMenus: () => void;
}

export function EraserMenu({
  menuRef, isOpen, setIsOpen, setActiveTool, eraserWidth, setEraserWidth, closeOtherMenus,
}: Props) {
  return (
    <div ref={menuRef} data-toolbar-key="eraser" className="relative flex shrink-0 items-center">
      <div className="flex h-7 items-center rounded-box text-mainText transition-all hover:bg-mainButtonHover hover:text-mainText sm:h-8">
        <button
          type="button"
          title="საშლელი"
          onClick={() => { setActiveTool('eraser'); setIsOpen(false); closeOtherMenus(); }}
          className="flex items-center gap-1 h-full px-2 rounded-box focus:outline-none">
          <Eraser className="size-3.5 sm:size-4" />
          <span className="font-mono text-[11px] font-medium opacity-90">{eraserWidth}px</span>
        </button>

        <button
          type="button"
          title="საშლელის სისქე"
          onClick={() => { setActiveTool('eraser'); setIsOpen(!isOpen); closeOtherMenus(); }}
          className="flex h-full cursor-pointer items-center justify-center rounded-box border-l border-hairline px-1 transition-colors duration-200 hover:bg-mainButtonHover hover:text-mainText">
          <ChevronDown className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-[120] mt-2 w-52 animate-in rounded-box border border-hairline bg-main p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 duration-150 sm:w-56">
          <div className="mb-2 flex items-center justify-between border-b border-hairline pb-2">
            <span className="text-xs font-bold text-mainText">საშლელის ზომა</span>
            <span className="font-mono text-xs font-bold text-navy">{eraserWidth}px</span>
          </div>

          <input
            type="range" min="12" max="96" step="2" value={eraserWidth}
            onChange={(e) => setEraserWidth(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-box bg-paper-deep accent-[#465D73]"
          />

          <div className="mt-2.5 flex items-center justify-between border-t border-hairline pt-2">
            {[20, 32, 48, 64, 80].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setEraserWidth(size)}
                className={`flex size-6 cursor-pointer items-center justify-center rounded-box transition-colors sm:size-7 ${
                  eraserWidth === size
                    ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]'
                    : 'text-mainText hover:bg-sectionHeader hover:text-mainText'
                }`}>
                <div className="rounded-box border-2 border-current" style={{ width: Math.min(16, 4 + size / 8), height: Math.min(16, 4 + size / 8) }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}