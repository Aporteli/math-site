'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PeriodNavigator({
  label,
  labelClassName,
  prevAriaLabel,
  nextAriaLabel,
  onPrev,
  onNext,
}: {
  label: string | number;
  labelClassName: string;
  prevAriaLabel: string;
  nextAriaLabel: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-box border border-hairline bg-paper p-1">
      <button
        type="button"
        onClick={onPrev}
        aria-label={prevAriaLabel}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink">
        <ChevronLeft className="size-4" />
      </button>
      <span className={`${labelClassName} truncate px-2 text-center text-sm font-bold text-ink`}>{label}</span>
      <button
        type="button"
        onClick={onNext}
        aria-label={nextAriaLabel}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
