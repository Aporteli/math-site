'use client';

import { Moon, Sun, Trash2 } from 'lucide-react';

interface Props {
  isTeacher: boolean;
  isStudent: boolean;
  isDark: boolean;
  onToggleDark: () => void;
  onClear: () => void;
}

export function ThemeClearButtons({ isTeacher, isStudent, isDark, onToggleDark, onClear }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onToggleDark}
        title="თემის შეცვლა"
        className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
        {isDark ? <Sun className="size-3.5 sm:size-4 text-amber-400" /> : <Moon className="size-3.5 sm:size-4" />}
      </button>
      {isTeacher && (
        <button
          type="button"
          onClick={onClear}
          title="დაფის გასუფთავება"
          className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors">
          <Trash2 className="size-3.5 sm:size-4" />
        </button>
      )}
    </div>
  );
}
