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
        data-toolbar-key="theme"
        onClick={onToggleDark}
        title="თემის შეცვლა"
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center border-r border-hairline text-mainText transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98] sm:size-8">
        {isDark ? <Sun className="size-3.5 text-brass sm:size-4" /> : <Moon className="size-3.5 sm:size-4" />}
      </button>
      {isTeacher && (
        <button
          type="button"
          data-toolbar-key="clear"
          onClick={onClear}
          title="დაფის გასუფთავება"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-rose-500 transition-all duration-200 hover:bg-rose-500/15 active:scale-[0.98] sm:size-8">
          <Trash2 className="size-3.5 sm:size-4" />
        </button>
      )}
    </div>
  );
}