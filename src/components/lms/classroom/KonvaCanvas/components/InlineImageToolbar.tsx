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
      className="pointer-events-auto absolute z-30 flex items-center gap-0.5 rounded-lg border border-white/10 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-md"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onCrop}
        title="ამოჭრა"
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-white/90 transition hover:bg-white/10"
      >
        <Crop className="size-3.5" />
        ამოჭრა
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="წაშლა"
        className="flex size-7 items-center justify-center rounded-md text-red-400 transition hover:bg-red-500/10"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}