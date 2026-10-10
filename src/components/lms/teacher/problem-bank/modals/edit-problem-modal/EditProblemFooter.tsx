'use client';

import { PenLine } from 'lucide-react';

export function EditProblemFooter({
  notice,
  cancelLabel,
  saveLabel,
  savingLabel,
  busy,
  disabled,
  onClose,
  onSubmit,
}: {
  notice: string | null;
  cancelLabel: string;
  saveLabel: string;
  savingLabel: string;
  busy: boolean;
  disabled: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-hairline bg-sectionHeader px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:px-5">
      {notice ? <p className="w-full text-sm text-brass-strong sm:me-auto sm:w-auto">{notice}</p> : null}
      <button
        type="button"
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-box border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper-deep sm:w-auto"
        onClick={onClose}>
        {cancelLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-box bg-[#465D73] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#526C85] disabled:opacity-60 sm:w-auto"
        onClick={onSubmit}>
        <PenLine className="size-4" aria-hidden="true" />
        {busy ? savingLabel : saveLabel}
      </button>
    </div>
  );
}
