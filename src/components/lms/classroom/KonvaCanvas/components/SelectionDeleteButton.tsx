import { Trash2 } from 'lucide-react';

interface SelectionDeleteButtonProps {
  x: number;
  y: number;
  onDelete: () => void;
}

export function SelectionDeleteButton({ x, y, onDelete }: SelectionDeleteButtonProps) {
  return (
    <button
      type="button"
      title="წაშლა"
      aria-label="წაშლა"
      className="pointer-events-auto absolute z-30 flex size-7 -translate-x-1/2 -translate-y-full cursor-pointer items-center justify-center rounded-box border border-rose-500/30 bg-rose-500/15 text-rose-500 shadow-sm"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
