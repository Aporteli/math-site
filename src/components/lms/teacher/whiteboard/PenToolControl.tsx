'use client';

import { ChevronDown, Pencil } from 'lucide-react';
import { STROKE_SIZES } from './constants';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function PenToolControl({ model }: { model: TeacherWhiteboardModel }) {
  const {
    activeTool,
    isPenMenuOpen,
    penMenuRef,
    setAndSaveTool,
    setAndSaveWidth,
    setIsColorMenuOpen,
    setIsEraserMenuOpen,
    setIsPenMenuOpen,
    setIsShapesMenuOpen,
    strokeWidth,
  } = model;
  return (
            <div ref={penMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-8 rounded-box transition-all shadow-xs ${activeTool === 'pen' ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]' : 'border border-hairline bg-main text-mainText hover:bg-mainButtonHover'}`}>
                <button
                  type="button"
                  title="კალამი"
                  onClick={() => {
                    setAndSaveTool('pen');
                    setIsPenMenuOpen(false);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                    setIsEraserMenuOpen(false);
                  }}
                  className="flex items-center gap-1 h-full px-2 rounded-box focus:outline-none">
                  <Pencil className="size-4" />
                  <span className="text-[11px] font-mono font-medium opacity-90">{strokeWidth}px</span>
                </button>
                <button
                  type="button"
                  title="სისქის მენიუ"
                  onClick={() => {
                    setIsPenMenuOpen((prev) => !prev);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1.5 h-full rounded-box transition-colors border-l ${activeTool === 'pen' ? 'border-white/20 hover:bg-[#526C85]' : 'border-hairline hover:bg-paper'}`}>
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${isPenMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
              {isPenMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-56 rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline">
                    <span className="text-xs font-semibold text-ink">კალმის სისქე</span>
                    <span className="text-xs font-mono font-bold text-navy">{strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={strokeWidth}
                    onChange={(e) => setAndSaveWidth(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-paper-deep rounded-box appearance-none cursor-pointer accent-[#465D73]"
                  />
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-hairline">
                    {STROKE_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setAndSaveWidth(size)}
                        className={`flex size-7 items-center justify-center rounded-box transition-colors ${strokeWidth === size ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : 'text-muted hover:bg-sectionHeader'}`}>
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
