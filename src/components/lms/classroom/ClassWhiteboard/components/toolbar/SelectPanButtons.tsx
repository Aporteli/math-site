'use client';

import { Hand, MousePointer } from 'lucide-react';

interface Props {
  isTeacher: boolean;
  activeTool: any;
  setActiveTool: (tool: any) => void;
  closeAllMenus: () => void;
  disabled?: boolean;
}

export function SelectPanButtons({ isTeacher, activeTool, setActiveTool, closeAllMenus, disabled = false }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      {isTeacher && (
        <button
          type="button"
          title="მონიშვნა / ზომის შეცვლა"
          onClick={() => {
            setActiveTool('select');
            closeAllMenus();
          }}
          className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
            activeTool === 'select'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
          <MousePointer className="size-3.5 sm:size-4" />
        </button>
      )}
      <button
        type="button"
        title="დაფის გადაადგილება (Pan)"
        disabled={disabled}
        onClick={() => {
          setActiveTool('hand');
          closeAllMenus();
        }}
        className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none ${
          activeTool === 'hand'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
        }`}>
        <Hand className="size-3.5 sm:size-4" />
      </button>
    </div>
  );
}
