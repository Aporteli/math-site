'use client';

import { Lock, LockOpen } from 'lucide-react';

interface LockButtonProps {
  locked: boolean;
  onClick: () => void;
}

export function LockButton({ locked, onClick }: LockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={locked}
      title={locked ? 'მართვის გამორთვა' : 'დაფის მიბმა მასწავლებლის ხედვასთან'}
      className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-box px-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
        locked
          ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] hover:bg-[#526C85]'
          : 'border border-hairline bg-main text-mainText hover:bg-mainButtonHover'
      }`}>
      {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
      <span>{locked ? 'მართვა ჩართულია' : 'მართვა'}</span>
    </button>
  );
}
