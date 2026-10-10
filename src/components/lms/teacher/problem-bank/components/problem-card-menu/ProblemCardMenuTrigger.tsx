'use client';

import { MoreVertical } from 'lucide-react';
import type { MouseEvent, RefObject } from 'react';

interface ProblemCardMenuTriggerProps {
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  menuId: string;
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function ProblemCardMenuTrigger({ triggerRef, open, menuId, label, onClick }: ProblemCardMenuTriggerProps) {
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-box border border-ink bg-white text-muted shadow-sm transition-colors hover:border-navy/30 hover:text-navy"
      onClick={onClick}>
      <MoreVertical className="size-4 text-ink" aria-hidden="true" />
    </button>
  );
}
