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
    : 'cursor-pointer hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98]';

  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={disabled}
        title="დაპატარავება (Ctrl + -)"
        className={`flex size-7 items-center justify-center rounded-box text-icons transition-all duration-200 sm:size-8 ${btn}`}>
        <ZoomOut className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onZoomReset}
        disabled={disabled}
        title="100%-ზე დაბრუნება (Ctrl + 0)"
        className={`flex h-7 min-w-[36px] items-center justify-center rounded-box px-1 font-mono text-[10px] font-bold text-mainText transition-all duration-200 sm:h-8 sm:min-w-[42px] sm:text-[11px] ${btn}`}>
        {zoomPercent}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={disabled}
        title="გადიდება (Ctrl + +)"
        className={`flex size-7 items-center justify-center rounded-box text-icons transition-all duration-200 sm:size-8 ${btn}`}>
        <ZoomIn className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onFit}
        disabled={disabled}
        title="ნახაზების ეკრანზე მორგება (Fit)"
        className={`flex size-7 items-center justify-center rounded-box text-icons transition-all duration-200 sm:size-8 ${btn}`}>
        <Frame className="size-3.5" />
      </button>
    </div>
  );
}
