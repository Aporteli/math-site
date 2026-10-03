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
    <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1">
      <button
        type="button"
        data-toolbar-key="undo"
        title="უკან დაბრუნება (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
        className={`flex size-7 items-center justify-center rounded-box transition-all duration-200 sm:size-8 ${
          canUndo
            ? 'cursor-pointer text-icons hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98]'
            : 'cursor-not-allowed text-muted/40'
        }`}>
        <Undo2 className="size-3.5 sm:size-4" />
      </button>

      <button
        type="button"
        data-toolbar-key="redo"
        title="წინ გადასვლა (Ctrl+Y)"
        disabled={!canRedo}
        onClick={onRedo}
        className={`flex size-7 items-center justify-center rounded-box transition-all duration-200 sm:size-8 ${
          canRedo
            ? 'cursor-pointer text-icons hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98]'
            : 'cursor-not-allowed text-muted/40'
        }`}>
        <Redo2 className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}
