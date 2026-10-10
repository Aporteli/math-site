'use client';

import { GraduationCap, X } from 'lucide-react';

export function SendProblemModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between bg-sectionHeader border-b border-hairline px-4 py-5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center text-brass-strong">
          <GraduationCap className="size-7" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">ამოცანის გაგზავნა</h3>
          <p className="text-xs text-muted">აირჩიეთ კლასი ან ცალკეული მოსწავლე</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex size-8 items-center justify-center text-muted hover:text-loss transition cursor-pointer">
        <X className="size-7" strokeWidth={2} />
      </button>
    </div>
  );
}
