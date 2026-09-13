'use client';

import { Lock, LockOpen } from 'lucide-react';

interface LockButtonProps {
  locked: boolean;
  onClick: () => void;
  isDark: boolean;
}

export function LockButton({ locked, onClick, isDark }: LockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={locked}
      title={locked ? 'მართვის გამორთვა' : 'დაფის მიბმა მასწავლებლის ხედვასთან'}
      className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-bold transition-colors active:scale-95 ${
        locked
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : isDark
            ? 'bg-white/10 text-slate-200 hover:bg-white/20'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
      <span>{locked ? 'მართვა ჩართულია' : 'მართვა'}</span>
    </button>
  );
}