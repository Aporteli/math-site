'use client';

import { Frame, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
}

export function ZoomControls({ zoomPercent, onZoomIn, onZoomOut, onZoomReset, onFit }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      <button
        type="button"
        onClick={onZoomOut}
        title="დაპატარავება (Ctrl + -)"
        className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95">
        <ZoomOut className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onZoomReset}
        title="100%-ზე დაბრუნება (Ctrl + 0)"
        className="flex h-7 sm:h-8 items-center justify-center px-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 transition-colors min-w-[36px] sm:min-w-[42px]">
        {zoomPercent}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        title="გადიდება (Ctrl + +)"
        className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95">
        <ZoomIn className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onFit}
        title="ნახაზების ეკრანზე მორგება (Fit)"
        className="flex size-7 sm:size-8 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors active:scale-95">
        <Frame className="size-3.5" />
      </button>
    </div>
  );
}
