'use client';

import { ChevronDown } from 'lucide-react';
import { SendStatusButton } from './SendStatusButton';
import type { CourseGroup } from './types';

interface CourseGroupHeaderProps {
  group: CourseGroup;
  isExpanded: boolean;
  isClassSent: boolean;
  isClassSending: boolean;
  onToggleExpand: () => void;
  onSendToClass: () => void;
}

export function CourseGroupHeader({
  group,
  isExpanded,
  isClassSent,
  isClassSending,
  onToggleExpand,
  onSendToClass,
}: CourseGroupHeaderProps) {
  return (
    <div className="flex bg-sectionHeader items-center gap-2 p-3">
      <button type="button" onClick={onToggleExpand} className="flex min-w-0 bg flex-1 items-center gap-3 text-left">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink truncate">{group.title}</p>
          <p className="text-[11px] text-muted">{group.students.length} მოსწავლე</p>
        </div>
      </button>

      <SendStatusButton
        sent={isClassSent}
        sending={isClassSending}
        idleLabel="კლასს"
        onClick={onSendToClass}
      />

      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={isExpanded ? 'დახურვა' : 'გახსნა'}
        className="flex size-7 shrink-0 items-center justify-center rounded-box text-muted hover:bg-paper hover:text-ink transition">
        <ChevronDown className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
