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
    <div className="bg-paper/30 border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-ink">სამუშაო სივრცე</h3>
        <span className="rounded-lg bg-navy-tint px-2 py-0.5 text-[10px] font-bold text-navy border border-navy/10">
          {tasksCount}
        </span>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 bg-white px-2 py-1 rounded-xl border border-hairline shadow-2xs w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onShiftDate(-1)}
          title="წინა დღე"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors shrink-0">
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center justify-center gap-1 px-1 flex-1 sm:flex-none">
          <CalendarIcon className="size-3.5 text-navy shrink-0" />
          <input
            type="date"
            value={selectedDateKey}
            onChange={(e) => {
              if (e.target.value) onDateChange(e.target.value);
            }}
            className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer text-center"
          />
        </div>

        <button
          type="button"
          onClick={() => onShiftDate(1)}
          title="შემდეგი დღე"
          className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors shrink-0">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}