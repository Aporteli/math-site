'use client';

import { ChevronDown, Eraser } from 'lucide-react';
import { ERASER_SIZES } from './constants';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function EraserToolControl({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    activeTool,
    eraserMenuRef,
    eraserWidth,
    isEraserMenuOpen,
    setAndSaveEraserWidth,
    setAndSaveTool,
    setIsColorMenuOpen,
    setIsEraserMenuOpen,
    setIsPenMenuOpen,
    setIsShapesMenuOpen,
    setIsSmoothMenuOpen,
    setIsStylusMenuOpen,
  } = model;
  return (
            <div ref={eraserMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-8 rounded-box transition-all shadow-xs ${
                  activeTool === 'eraser'
                    ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]'
                    : 'border border-hairline bg-main text-mainText hover:bg-mainButtonHover'
                }`}>
                <button
                  type="button"
                  title={copy.tools.eraser}
                  onClick={() => {
                    setAndSaveTool('eraser');
                    setIsEraserMenuOpen(false);
                    setIsPenMenuOpen(false);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                    setIsSmoothMenuOpen(false);
                    setIsStylusMenuOpen(false);
                  }}
                  className="flex items-center gap-1 h-full px-2 rounded-box focus:outline-none">
                  <Eraser className="size-4" />
                  <span className="text-[11px] font-mono font-medium opacity-90">{eraserWidth}px</span>
                </button>
                <button
                  type="button"
                  title="საშლელის ზომა"
                  onClick={() => {
                    setAndSaveTool('eraser');
                    setIsEraserMenuOpen((prev) => !prev);
                    setIsPenMenuOpen(false);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                    setIsSmoothMenuOpen(false);
                    setIsStylusMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1.5 h-full rounded-box transition-colors border-l ${
                    activeTool === 'eraser' ? 'border-white/20 hover:bg-[#526C85]' : 'border-hairline hover:bg-paper'
                  }`}>
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${isEraserMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
              {isEraserMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-56 rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline">
                    <span className="text-xs font-semibold text-ink">საშლელის ზომა</span>
                    <span className="text-xs font-mono font-bold text-navy">{eraserWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="96"
                    step="2"
                    value={eraserWidth}
                    onChange={(e) => setAndSaveEraserWidth(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-paper-deep rounded-box appearance-none cursor-pointer accent-[#465D73]"
                  />
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-hairline">
                    {ERASER_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setAndSaveEraserWidth(size)}
                        className={`size-7 flex items-center justify-center rounded-box transition-colors ${
                          eraserWidth === size
                            ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                            : 'hover:bg-paper text-muted'
                        }`}>
                        <div
                          className="rounded-box border-2 border-current"
                          style={{ width: Math.min(16, 4 + size / 8), height: Math.min(16, 4 + size / 8) }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
  );
}
