'use client';

import { AlertCircle, BarChart3, Table2 as TableIcon } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { StudentListView } from './types';

interface ViewSwitcherProps {
  view: StudentListView;
  setView: Dispatch<SetStateAction<StudentListView>>;
}

const viewButtonClass = (active: boolean) =>
  `group relative inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-box px-1.5 py-2 text-xs font-bold transition-all duration-200 sm:min-h-10 sm:px-3 ${
    active ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
  }`;

export function ViewSwitcher({ view, setView }: ViewSwitcherProps) {
  return (
    <div className="grid w-full grid-cols-3 gap-1 bg-main p-1 sm:flex sm:w-auto sm:min-w-[16rem]">
      <button
        type="button"
        onClick={() => setView('table')}
        title="ცხრილის ხედი"
        aria-pressed={view === 'table'}
        className={viewButtonClass(view === 'table')}>
        <TableIcon className="relative z-10 size-4 shrink-0" />
        <span className="relative z-10 truncate text-[11px] sm:text-xs">ცხრილი</span>
        <span
          className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
            view === 'table' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => setView('debt')}
        title="დავალიანებები"
        aria-pressed={view === 'debt'}
        className={viewButtonClass(view === 'debt')}>
        <AlertCircle className="relative z-10 size-4 shrink-0" />
        <span className="relative z-10 truncate text-[11px] sm:text-xs">ვალები</span>
        <span
          className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
            view === 'debt' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => setView('reports')}
        title="ანგარიში"
        aria-pressed={view === 'reports'}
        className={viewButtonClass(view === 'reports')}>
        <BarChart3 className="relative z-10 size-4 shrink-0" />
        <span className="relative z-10 truncate text-[11px] sm:text-xs">ანგარიში</span>
        <span
          className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
            view === 'reports' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
          }`}
        />
      </button>
    </div>
  );
}
