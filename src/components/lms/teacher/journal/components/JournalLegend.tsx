'use client';

import { ChevronDown, Repeat } from 'lucide-react';

export function JournalLegend() {
  return (
    <div className="shrink-0 border-b border-hairline bg-sectionHeader px-4 py-2 text-[11px] font-medium text-muted">
      {/* Desktop legend */}
      <div className="hidden sm:flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-box bg-navy" />
          <span className="text-ink">ჟურნალის ღონისძიება</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-box bg-sky-500" />
          <span className="text-ink">საიტზე რეგისტრირებული</span>
        </span>
        <span className="flex items-center gap-1.5 ">
          <span className="inline-block size-3 rounded-box bg-amber-400" />
          <span className="text-ink">სახლში</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-navy">
          <Repeat className="size-3" />
          <span>ავტომატური სინქრონიზაცია</span>
        </span>
      </div>
      {/* Mobile legend dropdown */}
      <div className="flex items-center sm:hidden relative">
        <details className="w-full">
          <summary className="flex w-full items-center gap-2 cursor-pointer select-none py-1 text-navy">
            <ChevronDown className="size-3.5 text-navy-strong" />
          </summary>
          <div className="z-10 mt-2 flex flex-col gap-3 rounded-box border border-hairline bg-main p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-box bg-navy" />
              <span className="text-ink">ჟურნალის ღონისძიება</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-box bg-sky-500" />
              <span className="text-ink">საიტზე რეგისტრირებული</span>
            </span>
            <span className="flex items-center gap-1.5 ">
              <span className="inline-block size-3 rounded-box bg-amber-400" />
              <span className="text-ink">სახლში</span>
            </span>
            <span className="flex items-center gap-1.5 text-navy">
              <Repeat className="size-3" />
              <span>ავტომატური სინქრონიზაცია</span>
            </span>
          </div>
        </details>
      </div>
    </div>
  );
}
