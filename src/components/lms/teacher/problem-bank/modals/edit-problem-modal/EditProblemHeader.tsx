'use client';

import { X } from 'lucide-react';

export function EditProblemHeader({
  titleId,
  title,
  closeLabel,
  onClose,
}: {
  titleId: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start bg-sectionHeader justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
      <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center text-muted hover:text-loss"
        aria-label={closeLabel}
        onClick={onClose}>
        <X className="size-7" aria-hidden="true" />
      </button>
    </div>
  );
}
