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
    <div ref={menuRef} data-toolbar-key="color" className="relative flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); closeOtherMenus(); }}
        title="ფერის არჩევა"
        className="flex h-7 cursor-pointer items-center gap-1 rounded-box border border-hairline bg-main px-1.5 transition-colors duration-200 hover:bg-mainButtonHover sm:h-8">
        <div className="size-4 rounded-box border border-hairline shadow-2xs sm:size-4.5" style={{ backgroundColor: effectiveStroke }} />
        <ChevronDown className={`size-3 text-icons transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-[120] mt-2 w-max animate-in rounded-box border border-hairline bg-main p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2">
            {WHITEBOARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStrokeColor(c)}
                className={`size-6 rounded-box transition-transform ${
                  strokeColor === c ? 'scale-125 ring-2 ring-[#465D73] ring-offset-1 ring-offset-main' : 'hover:scale-110'
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