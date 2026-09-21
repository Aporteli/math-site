'use client';

import type { RefObject } from 'react';
import { ChevronDown, Circle, Diamond, Minus, MoveRight, Square, Star, Triangle } from 'lucide-react';

const SHAPE_TOOLS = [
  { id: 'line', icon: Minus, title: 'ხაზი' },
  { id: 'arrow', icon: MoveRight, title: 'ისარი' },
  { id: 'rect', icon: Square, title: 'მართკუთხედი' },
  { id: 'circle', icon: Circle, title: 'წრე' },
  { id: 'triangle', icon: Triangle, title: 'სამკუთხედი' },
  { id: 'diamond', icon: Diamond, title: 'რომბი' },
  { id: 'star', icon: Star, title: 'ვარსკვლავი' },
];

interface Props {
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  activeTool: any;
  setActiveTool: (t: any) => void;
  closeOtherMenus: () => void;
}

export function ShapesMenu({ menuRef, isOpen, setIsOpen, activeTool, setActiveTool, closeOtherMenus }: Props) {
  const currentShapeObj = SHAPE_TOOLS.find((s) => s.id === activeTool) || SHAPE_TOOLS[2];
  const CurrentShapeIcon = currentShapeObj.icon;
  const isShapeActive = SHAPE_TOOLS.some((s) => s.id === activeTool);

  return (
    <div ref={menuRef} className="relative flex shrink-0 items-center">
      <div className={`flex items-center h-7 sm:h-8 rounded-xl transition-all shadow-xs ${
        isShapeActive
          ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/20'
          : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
      }`}>
        <button
          type="button"
          title="ფიგურა"
          onClick={() => { setActiveTool(currentShapeObj.id); setIsOpen(false); closeOtherMenus(); }}
          className="flex items-center justify-center size-7 sm:size-8 rounded-l-xl focus:outline-none">
          <CurrentShapeIcon className="size-3.5 sm:size-4" />
        </button>

        <button
          type="button"
          title="ფიგურების მენიუ"
          onClick={() => { setIsOpen(!isOpen); closeOtherMenus(); }}
          className={`flex items-center justify-center px-1 h-full rounded-r-xl transition-colors border-l ${
            isShapeActive
              ? 'border-indigo-500/40 hover:bg-indigo-700'
              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}>
          <ChevronDown className={`size-2.5 sm:size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-[120] w-36 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-2 gap-1">
            {SHAPE_TOOLS.map((s) => {
              const SIcon = s.icon;
              const isSelected = activeTool === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setActiveTool(s.id); setIsOpen(false); }}
                  className={`flex items-center justify-center size-9 sm:size-10 rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}>
                  <SIcon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}