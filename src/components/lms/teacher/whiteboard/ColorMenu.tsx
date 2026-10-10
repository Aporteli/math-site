'use client';

import { ChevronDown } from 'lucide-react';
import { COLORS } from './constants';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function ColorMenu({ model }: { model: TeacherWhiteboardModel }) {
  const {
    colorMenuRef,
    effectiveStroke,
    isColorMenuOpen,
    setAndSaveColor,
    setIsColorMenuOpen,
    setIsEraserMenuOpen,
    setIsPenMenuOpen,
    setIsShapesMenuOpen,
    setIsStylusMenuOpen,
    strokeColor,
  } = model;
  return (
            <div ref={colorMenuRef} className="relative flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => {
                  setIsColorMenuOpen((prev) => !prev);
                  setIsPenMenuOpen(false);
                  setIsShapesMenuOpen(false);
                  setIsStylusMenuOpen(false);
                  setIsEraserMenuOpen(false);
                }}
                title="ფერის არჩევა"
                className="flex items-center gap-1.5 h-8 px-2 rounded-box bg-paper hover:bg-paper-deep transition-colors border border-hairline">
                <span
                  className="size-4 rounded-box border border-black/10 shadow-2xs"
                  style={{ backgroundColor: effectiveStroke }}
                />
                <ChevronDown
                  className={`size-3 text-muted transition-transform duration-200 ${isColorMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isColorMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-max rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.label}
                        onClick={() => setAndSaveColor(c.hex)}
                        className={`size-7 rounded-box border transition-transform ${strokeColor === c.hex ? 'scale-115 ring-2 ring-[#465D73] ring-offset-1' : 'border-black/10 hover:scale-110'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
  );
}
