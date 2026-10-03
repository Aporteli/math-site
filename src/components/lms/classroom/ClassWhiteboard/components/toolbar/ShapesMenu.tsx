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

  return (
    <div ref={menuRef} data-toolbar-key="shapes" className="relative flex shrink-0 items-center">
      <div className="flex h-7 items-center rounded-box text-slate-700 transition-all hover:bg-slate-100 sm:h-8 dark:text-slate-200 dark:hover:bg-slate-800">
        <button
          type="button"
          title="ფიგურა"
          onClick={() => { setActiveTool(currentShapeObj.id); setIsOpen(false); closeOtherMenus(); }}
          className="flex items-center justify-center size-7 sm:size-8 rounded-box focus:outline-none">
          <CurrentShapeIcon className="size-3.5 sm:size-4" />
        </button>

        <button
          type="button"
          title="ფიგურების მენიუ"
          onClick={() => { setIsOpen(!isOpen); closeOtherMenus(); }}
          className="flex h-full items-center justify-center rounded-box border-l border-slate-200 px-1 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:hover:bg-slate-600">
          <ChevronDown className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-[120] w-36 rounded-box bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-2 gap-1">
            {SHAPE_TOOLS.map((s) => {
              const SIcon = s.icon;
              const isSelected = activeTool === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setActiveTool(s.id); setIsOpen(false); }}
                  className={`flex items-center justify-center size-9 sm:size-10 rounded-box transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}>
                  <SIcon className="size-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}