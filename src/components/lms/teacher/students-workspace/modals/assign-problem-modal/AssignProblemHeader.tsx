'use client';

import { Send, X } from 'lucide-react';

export function AssignProblemHeader({ studentName, onClose }: { studentName: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline bg-sectionHeader px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center text-navy">
          <Send className="size-6" strokeWidth={2.5} />
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-mainText">დავალების გადაცემა</h3>
          <span className="text-xs text-mainText/70">/ {studentName}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex size-7 items-center justify-center text-mainText hover:text-loss transition-colors cursor-pointer">
        <X className="size-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}
