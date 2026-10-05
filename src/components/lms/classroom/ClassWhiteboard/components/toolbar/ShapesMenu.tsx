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
      <div className="flex h-7 items-center rounded-box text-mainText transition-all hover:bg-mainButtonHover hover:text-mainText sm:h-8">
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
          className="flex h-full cursor-pointer items-center justify-center border-r border-hairline pr-2 px-1 transition-colors duration-200 hover:bg-mainButtonHover hover:text-mainText">
          <ChevronDown className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-[120] mt-2 w-36 animate-in rounded-box border border-hairline bg-main p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-2 gap-1">
            {SHAPE_TOOLS.map((s) => {
              const SIcon = s.icon;
              const isSelected = activeTool === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setActiveTool(s.id); setIsOpen(false); }}
                  className={`flex size-9 cursor-pointer items-center justify-center rounded-box transition-colors sm:size-10 ${
                    isSelected
                      ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]'
                      : 'text-mainText hover:bg-sectionHeader'
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