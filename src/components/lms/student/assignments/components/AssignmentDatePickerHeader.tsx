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
      {/* სათაური და რაოდენობის ინდიკატორი */}
      <div className="flex items-center gap-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
          სამუშაო სივრცე
        </h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-md bg-paper-deep px-1.5 text-[11px] font-bold text-brass border border-hairline">
          {tasksCount}
        </span>
      </div>

      {/* იდენტური თარიღის გადამრთველი პანელი */}
      <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 w-full sm:w-auto">
        <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 bg-brass-tint/30 hover:bg-brass-tint/50 px-2.5 py-1.5 rounded-xl border border-brass/25 shadow-inner transition-colors w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onShiftDate(-1)}
            title="წინა დღე"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-paper-deep text-muted hover:text-ink transition-colors shrink-0 cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input');
              input?.showPicker?.();
            }}
            className="group flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl hover:bg-surface transition-colors cursor-pointer flex-1 sm:flex-none"
          >
            <CalendarIcon className="size-3.5 text-brass-strong group-hover:text-brass shrink-0 transition-colors" />
            <input
              type="date"
              value={selectedDateKey}
              onChange={(e) => {
                if (e.target.value) onDateChange(e.target.value);
              }}
              className="text-xs font-bold text-ink bg-transparent outline-none cursor-pointer text-center [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
            />
          </div>

          <button
            type="button"
            onClick={() => onShiftDate(1)}
            title="შემდეგი დღე"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-paper-deep text-muted hover:text-ink transition-colors shrink-0 cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}