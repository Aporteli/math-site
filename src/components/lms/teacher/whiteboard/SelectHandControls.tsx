'use client';

import { ChevronDown, Hand, Lasso, MousePointer, Pencil } from 'lucide-react';
import { ToolButton } from './ToolButton';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { WhiteboardCopy } from './types';

export function SelectHandControls({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    activeTool,
    isSelectMenuOpen,
    selectMenuRef,
    selectMode,
    setAndSaveTool,
    setIsColorMenuOpen,
    setIsEraserMenuOpen,
    setIsPenMenuOpen,
    setIsSelectMenuOpen,
    setIsShapesMenuOpen,
    setSelectMode,
  } = model;
  return (
          <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
            <div ref={selectMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-8 rounded-box transition-all shadow-xs ${activeTool === 'select' ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]' : 'border border-hairline bg-main text-mainText hover:bg-mainButtonHover'}`}>
                <button
                  type="button"
                  title={
                    selectMode === 'freeform'
                      ? 'თავისუფალი მონიშვნა'
                      : selectMode === 'draw'
                        ? 'დახატვით მონიშვნა'
                        : copy.tools.select
                  }
                  onClick={() => {
                    setAndSaveTool('select');
                    setIsSelectMenuOpen(false);
                  }}
                  className="flex items-center justify-center size-8 rounded-box focus:outline-none">
                  {selectMode === 'freeform' ? (
                    <Lasso className="size-4" />
                  ) : selectMode === 'draw' ? (
                    <Pencil className="size-4" />
                  ) : (
                    <MousePointer className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  title="მონიშვნის ტიპი"
                  onClick={() => {
                    setIsSelectMenuOpen((prev) => !prev);
                    setIsPenMenuOpen(false);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                    setIsEraserMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1 h-full rounded-box transition-colors border-l ${activeTool === 'select' ? 'border-white/20 hover:bg-[#526C85]' : 'border-hairline hover:bg-paper'}`}>
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${isSelectMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
              {isSelectMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-44 rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectMode('rect');
                      setAndSaveTool('select');
                      setIsSelectMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-box px-2 py-1.5 text-xs ${selectMode === 'rect' ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : 'text-mainText hover:bg-sectionHeader'}`}>
                    <MousePointer className="size-3.5" />
                    მართკუთხედი
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectMode('freeform');
                      setAndSaveTool('select');
                      setIsSelectMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-box px-2 py-1.5 text-xs ${selectMode === 'freeform' ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : 'text-mainText hover:bg-sectionHeader'}`}>
                    <Lasso className="size-3.5" />
                    თავისუფალი
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectMode('draw');
                      setAndSaveTool('select');
                      setIsSelectMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-box px-2 py-1.5 text-xs ${selectMode === 'draw' ? 'bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]' : 'text-mainText hover:bg-sectionHeader'}`}>
                    <Pencil className="size-3.5" />
                    დახატვა
                  </button>
                </div>
              )}
            </div>
            <ToolButton title={copy.tools.hand} active={activeTool === 'hand'} onClick={() => setAndSaveTool('hand')}>
              <Hand className="size-4" />
            </ToolButton>
          </div>
  );
}
