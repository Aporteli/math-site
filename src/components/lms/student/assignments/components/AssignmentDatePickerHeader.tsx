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
    <div className="flex flex-col gap-3 border-b border-hairline bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex items-center gap-2.5">
        <h3 className="text-sm font-bold text-ink">სამუშაო სივრცე</h3>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-navy-tint px-2 py-0.5 text-[11px] font-bold text-navy">
          {tasksCount}
        </span>
      </div>

      <div className="flex w-full shrink-0 items-center rounded-full border border-hairline bg-paper p-1 sm:w-auto">
        <button
          type="button"
          onClick={() => onShiftDate(-1)}
          title="წინა დღე"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div
          onClick={(e) => {
            const input = e.currentTarget.querySelector('input');
            input?.showPicker?.();
          }}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 sm:flex-none"
        >
          <CalendarIcon className="size-3.5 shrink-0 text-brass-strong" />
          <input
            type="date"
            value={selectedDateKey}
            onChange={(e) => {
              if (e.target.value) onDateChange(e.target.value);
            }}
            className="cursor-pointer bg-transparent text-center text-xs font-bold text-ink outline-none scheme-light dark:scheme-dark [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </div>

        <button
          type="button"
          onClick={() => onShiftDate(1)}
          title="შემდეგი დღე"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
