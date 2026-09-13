'use client';

import { Frame, ZoomIn, ZoomOut } from 'lucide-react';

interface Props {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
  disabled?: boolean;
}

export function ZoomControls({ zoomPercent, onZoomIn, onZoomOut, onZoomReset, onFit, disabled = false }: Props) {
  const btn = disabled
    ? 'pointer-events-none opacity-40'
    : 'hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95';

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={disabled}
        title="დაპატარავება (Ctrl + -)"
        className={`flex size-7 sm:size-8 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 transition-colors ${btn}`}>
        <ZoomOut className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onZoomReset}
        disabled={disabled}
        title="100%-ზე დაბრუნება (Ctrl + 0)"
        className={`flex h-7 sm:h-8 items-center justify-center px-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 transition-colors min-w-[36px] sm:min-w-[42px] ${btn}`}>
        {zoomPercent}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={disabled}
        title="გადიდება (Ctrl + +)"
        className={`flex size-7 sm:size-8 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 transition-colors ${btn}`}>
        <ZoomIn className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onFit}
        disabled={disabled}
        title="ნახაზების ეკრანზე მორგება (Fit)"
        className={`flex size-7 sm:size-8 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 transition-colors ${btn}`}>
        <Frame className="size-3.5" />
      </button>
    </div>
  );
}
