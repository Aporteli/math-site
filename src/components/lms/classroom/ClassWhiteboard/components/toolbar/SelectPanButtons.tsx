'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown, Hand, Lasso, MousePointer, Pencil } from 'lucide-react';

interface Props {
  isTeacher: boolean;
  activeTool: any;
  setActiveTool: (tool: any) => void;
  closeAllMenus: () => void;
  disabled?: boolean;
  selectMode: 'rect' | 'freeform' | 'draw';
  setSelectMode: (mode: 'rect' | 'freeform' | 'draw') => void;
  isSelectMenuOpen: boolean;
  setIsSelectMenuOpen: (open: boolean) => void;
}

export function SelectPanButtons({
  isTeacher,
  setActiveTool,
  closeAllMenus,
  disabled = false,
  selectMode,
  setSelectMode,
  isSelectMenuOpen,
  setIsSelectMenuOpen,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSelectMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsSelectMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isSelectMenuOpen, setIsSelectMenuOpen]);

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
      {isTeacher && (
        <div ref={menuRef} className="relative flex shrink-0 items-center">
          <div
            data-toolbar-key="select"
            className="flex h-7 items-center rounded-box text-icons transition-colors sm:h-8">
            <button
              type="button"
              title={
                selectMode === 'freeform'
                  ? 'თავისუფალი მონიშვნა'
                  : selectMode === 'draw'
                    ? 'დახატვით მონიშვნა'
                    : 'მონიშვნა / ზომის შეცვლა'
              }
              onClick={() => {
                setActiveTool('select');
                setIsSelectMenuOpen(false);
                closeAllMenus();
              }}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98] sm:size-8">
              {selectMode === 'freeform' ? (
                <Lasso className="size-3.5 sm:size-4" />
              ) : selectMode === 'draw' ? (
                <Pencil className="size-3.5 sm:size-4" />
              ) : (
                <MousePointer className="size-3.5 sm:size-4" />
              )}
            </button>
            <button
              type="button"
              title="მონიშვნის ტიპი"
              onClick={() => {
                setIsSelectMenuOpen(!isSelectMenuOpen);
                closeAllMenus();
              }}
              className="flex h-full cursor-pointer items-center border-r border-hairline px-0.5 transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText">
              <ChevronDown className={`size-3 transition-transform duration-200 ${isSelectMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {isSelectMenuOpen && (
            <div className="absolute top-full left-0 z-[120] mt-2 w-44 rounded-box border border-hairline bg-main p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <button
                type="button"
                onClick={() => {
                  setSelectMode('rect');
                  setActiveTool('select');
                  setIsSelectMenuOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-bold ${
                  selectMode === 'rect' ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]' : 'text-mainText hover:bg-sectionHeader'
                }`}>
                <MousePointer className="size-3.5" />
                მართკუთხედი
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectMode('freeform');
                  setActiveTool('select');
                  setIsSelectMenuOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-bold ${
                  selectMode === 'freeform' ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]' : 'text-mainText hover:bg-sectionHeader'
                }`}>
                <Lasso className="size-3.5" />
                თავისუფალი
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectMode('draw');
                  setActiveTool('select');
                  setIsSelectMenuOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-bold ${
                  selectMode === 'draw' ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]' : 'text-mainText hover:bg-sectionHeader'
                }`}>
                <Pencil className="size-3.5" />
                დახატვა
              </button>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        data-toolbar-key="hand"
        title="დაფის გადაადგილება (Pan)"
        disabled={disabled}
        onClick={() => {
          setActiveTool('hand');
          closeAllMenus();
        }}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:size-8">
        <Hand className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}