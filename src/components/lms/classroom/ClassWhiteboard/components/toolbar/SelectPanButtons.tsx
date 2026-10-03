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
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      {isTeacher && (
        <div ref={menuRef} className="relative flex shrink-0 items-center">
          <div
            data-toolbar-key="select"
            className="flex items-center h-7 sm:h-8 rounded-box text-slate-600 transition-colors dark:text-slate-300">
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
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-box hover:bg-slate-100 dark:hover:bg-slate-800">
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
              className="flex h-full items-center  border-r border-slate-200 px-0.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              <ChevronDown className={`size-3 transition-transform duration-200 ${isSelectMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {isSelectMenuOpen && (
            <div className="absolute top-full left-0 z-[120] mt-2 w-44 rounded-box border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setSelectMode('rect');
                  setActiveTool('select');
                  setIsSelectMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-medium ${
                  selectMode === 'rect' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
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
                className={`flex w-full items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-medium ${
                  selectMode === 'freeform' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
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
                className={`flex w-full items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-medium ${
                  selectMode === 'draw' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
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
        className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-box text-slate-600 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
        <Hand className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}