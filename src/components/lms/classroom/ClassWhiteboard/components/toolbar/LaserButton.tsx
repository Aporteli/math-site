'use client';

import { Crosshair } from 'lucide-react';

interface Props {
  activeTool: any;
  setActiveTool: (t: any) => void;
  closeAllMenus: () => void;
}

export function LaserButton({ setActiveTool, closeAllMenus }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      <button
        type="button"
        data-toolbar-key="laser"
        title="ლაზერული მაჩვენებელი (Laser Pointer)"
        onClick={() => { setActiveTool('laser'); closeAllMenus(); }}
        className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-box text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        <Crosshair className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}