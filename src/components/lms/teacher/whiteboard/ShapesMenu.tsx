'use client';

import { ChevronDown } from 'lucide-react';
import { SHAPE_TOOLS } from './constants';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function ShapesMenu({ model }: { model: TeacherWhiteboardModel }) {
  const {
    CurrentShapeIcon,
    activeTool,
    currentShapeObj,
    isShapeActive,
    isShapesMenuOpen,
    setAndSaveTool,
    setIsColorMenuOpen,
    setIsEraserMenuOpen,
    setIsPenMenuOpen,
    setIsShapesMenuOpen,
    shapesMenuRef,
  } = model;
  return (
            <div ref={shapesMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-8 rounded-box transition-all shadow-xs ${isShapeActive ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]' : 'border border-hairline bg-main text-mainText hover:bg-mainButtonHover'}`}>
                <button
                  type="button"
                  title="ფიგურა"
                  onClick={() => {
                    setAndSaveTool(currentShapeObj.id);
                    setIsShapesMenuOpen(false);
                    setIsPenMenuOpen(false);
                    setIsColorMenuOpen(false);
                  }}
                  className="flex items-center justify-center size-8 rounded-box focus:outline-none">
                  <CurrentShapeIcon className="size-4" />
                </button>
                <button
                  type="button"
                  title="ფიგურების მენიუ"
                  onClick={() => {
                    setIsShapesMenuOpen((prev) => !prev);
                    setIsPenMenuOpen(false);
                    setIsColorMenuOpen(false);
                    setIsEraserMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1.5 h-full rounded-box transition-colors border-l ${isShapeActive ? 'border-white/20 hover:bg-[#526C85]' : 'border-hairline hover:bg-paper'}`}>
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${isShapesMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
              {isShapesMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-48 rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="grid grid-cols-2 gap-1.5">
                    {SHAPE_TOOLS.map((s) => {
                      const SIcon = s.icon;
                      const isSelected = activeTool === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          title={s.label}
                          onClick={() => {
                            setAndSaveTool(s.id);
                            setIsShapesMenuOpen(false);
                          }}
                          className={`flex items-center gap-1.5 rounded-box px-2 py-1.5 text-xs transition-colors ${isSelected ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : 'text-mainText hover:bg-sectionHeader'}`}>
                          <SIcon className="size-3.5 shrink-0" />
                          <span className="truncate text-[11px]">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
  );
}
