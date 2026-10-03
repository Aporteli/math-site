'use client';

import { Crop, Trash2 } from 'lucide-react';

interface Props {
  /** Container-relative X for the toolbar's anchor point. */
  x: number;
  y: number;
  onCrop: () => void;
  onDelete: () => void;
}

export function InlineImageToolbar({ x, y, onCrop, onDelete }: Props) {
  return (
    <div
      className="pointer-events-auto absolute z-30 flex items-center gap-0.5 rounded-box border border-hairline bg-paper p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onCrop}
        title="ამოჭრა"
        className="flex h-7 cursor-pointer items-center gap-1.5 rounded-box px-2 text-xs font-bold text-ink transition-colors hover:bg-mainButtonHover"
      >
        <Crop className="size-3.5" />
        ამოჭრა
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="წაშლა"
        className="flex size-7 cursor-pointer items-center justify-center rounded-box text-rose-500 transition-colors hover:bg-rose-500/15"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}