'use client';

import { Check, Loader2, Trash2 } from 'lucide-react';

interface EventPopoverActionsProps {
  mode: 'create' | 'edit';
  expanded: boolean;
  title: string;
  isSaving: boolean;
  onDelete: () => void;
  onExpand: () => void;
  onSave: () => void;
}

export function EventPopoverActions({
  mode,
  expanded,
  title,
  isSaving,
  onDelete,
  onExpand,
  onSave,
}: EventPopoverActionsProps) {
  return (
    <div className="flex items-center justify-between pt-1">
      {mode === 'edit' ? (
        <button
          type="button"
          onClick={onDelete}
          className="flex cursor-pointer items-center gap-1.5 rounded-box border border-rose-500/30 bg-rose-500/15 px-2.5 py-1.5 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-500/25">
          <Trash2 className="size-3.5" />
          წაშლა
        </button>
      ) : !expanded ? (
        <button
          type="button"
          onClick={onExpand}
          className="cursor-pointer text-xs font-bold text-navy hover:underline">
          მეტი პარამეტრი
        </button>
      ) : (
        <span />
      )}

      <button
        type="button"
        disabled={!title.trim() || isSaving}
        onClick={onSave}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-box bg-[#465D73] px-4 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
        {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 " />}
        შენახვა
      </button>
    </div>
  );
}
