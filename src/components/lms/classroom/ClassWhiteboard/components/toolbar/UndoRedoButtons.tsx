'use client';

import { Redo2, Undo2 } from 'lucide-react';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoButtons({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1 dark:border-slate-800">
      <button
        type="button"
        title="უკან დაბრუნება (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
        className={`flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all ${
          canUndo
            ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95'
            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
        }`}>
        <Undo2 className="size-3.5 sm:size-4" />
      </button>

      <button
        type="button"
        title="წინ გადასვლა (Ctrl+Y)"
        disabled={!canRedo}
        onClick={onRedo}
        className={`flex size-7 sm:size-8 items-center justify-center rounded-xl transition-all ${
          canRedo
            ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95'
            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
        }`}>
        <Redo2 className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}
