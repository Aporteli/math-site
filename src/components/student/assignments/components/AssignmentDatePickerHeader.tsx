'use client';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface AssignmentDatePickerHeaderProps {
  tasksCount: number;
  selectedDateKey: string;
  onShiftDate: (days: number) => void;
  onDateChange: (dateKey: string) => void;
}

export function AssignmentDatePickerHeader({
  tasksCount,
  selectedDateKey,
  onShiftDate,
  onDateChange,
}: AssignmentDatePickerHeaderProps) {
  return (
    <div className="bg-paper border-b border-hairline px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* სათაური და რაოდენობის ინდიკატორი Lichess-ის ბრინჯაოსფერ ტონებში */}
      <div className="flex items-center gap-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
          სამუშაო სივრცე
        </h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-md bg-paper-deep px-1.5 text-[11px] font-bold text-brass border border-hairline">
          {tasksCount}
        </span>
      </div>

      {/* Lichess-ის პანელის სტილის კალენდრის ბლოკი */}
      <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 bg-surface px-1.5 py-1 rounded-xl border border-hairline shadow-inner w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onShiftDate(-1)}
          title="წინა დღე"
          className="flex size-7 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-deep transition-colors shrink-0"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center justify-center gap-1.5 px-2 flex-1 sm:flex-none">
          <CalendarIcon className="size-3.5 text-brass shrink-0" />
          <input
            type="date"
            value={selectedDateKey}
            onChange={(e) => {
              if (e.target.value) onDateChange(e.target.value);
            }}
            className="text-xs font-bold text-ink bg-transparent outline-none cursor-pointer text-center [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        <button
          type="button"
          onClick={() => onShiftDate(1)}
          title="შემდეგი დღე"
          className="flex size-7 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-paper-deep transition-colors shrink-0"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}