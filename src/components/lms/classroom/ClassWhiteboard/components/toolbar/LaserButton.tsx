'use client';

import { Crosshair } from 'lucide-react';

interface Props {
  activeTool: any;
  setActiveTool: (t: any) => void;
  closeAllMenus: () => void;
}

export function LaserButton({ setActiveTool, closeAllMenus }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
      <button
        type="button"
        data-toolbar-key="laser"
        title="ლაზერული მაჩვენებელი (Laser Pointer)"
        onClick={() => { setActiveTool('laser'); closeAllMenus(); }}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-mainText transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98] sm:size-8">
        <Crosshair className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}