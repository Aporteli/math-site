'use client';

import { Maximize2, RotateCcw, X } from 'lucide-react';

export function DashboardHeader({
  active,
  maximized,
  onDragStart,
  onReset,
  onToggleMaximized,
  onClose,
}: {
  active: boolean;
  maximized: boolean;
  onDragStart: ((event: React.PointerEvent<HTMLDivElement>) => void) | undefined;
  onReset: () => void;
  onToggleMaximized: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onPointerDown={onDragStart}
      className={`flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-hairline bg-sectionHeader px-3 py-2 ${
        maximized ? '' : 'cursor-grab select-none active:cursor-grabbing'
      }`}>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-bold text-mainText">ოთახები</p>

        <p className="truncate text-[11px] font-medium text-muted">
          {active ? 'ჯგუფები გაყოფილია' : 'ყველა მთავარ ოთახშია'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onReset}
          title="საწყის პოზიციაზე დაბრუნება"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText"
          aria-label="Reset">
          <RotateCcw className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleMaximized}
          title={maximized ? 'აღდგენა' : 'გაფართოება'}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText"
          aria-label="Maximize">
          <Maximize2 className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText"
          aria-label="დახურვა">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
