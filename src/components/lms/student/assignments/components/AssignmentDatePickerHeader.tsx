'use client';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AssignmentContentTabsHeader } from './AssignmentContentTabsHeader';
import { StudentContentTab } from '../types/student-assignment.types';

interface AssignmentDatePickerHeaderProps {
  selectedDateKey: string;
  onShiftDate: (days: number) => void;
  onDateChange: (dateKey: string) => void;
  activeTab: StudentContentTab;
  onTabChange: (tab: StudentContentTab) => void;
  tasksCount: number;
  answersCount: number;
  materialsCount: number;
  formattedSelectedDate: string;
}

export function AssignmentDatePickerHeader({
  activeTab,
  onTabChange,
  tasksCount,
  answersCount,
  materialsCount,
  formattedSelectedDate,
  selectedDateKey,
  onShiftDate,
  onDateChange,
}: AssignmentDatePickerHeaderProps) {
  return (
    <>
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <div className="flex h-18 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-sectionHeader px-3 sm:px-4">
        <AssignmentContentTabsHeader
          activeTab={activeTab}
          onTabChange={onTabChange}
          tasksCount={tasksCount}
          answersCount={answersCount}
          materialsCount={materialsCount}
          formattedSelectedDate={formattedSelectedDate}
        />
       <div className="flex w-full items-stretch overflow-hidden rounded-box border border-border/10 bg-main shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] sm:w-auto">
  <button
    type="button"
    onClick={() => onShiftDate(-1)}
    title="წინა დღე"
    className="flex size-9 shrink-0 items-center justify-center border-r border-border/10 text-muted transition-all duration-200 hover:bg-surface hover:text-ink active:scale-95"
  >
    <ChevronLeft className="size-4" />
  </button>

  <div
    onClick={(e) => {
      const input = e.currentTarget.querySelector('input');
      input?.showPicker?.();
    }}
    className="group flex min-w-[155px] cursor-pointer items-center justify-center gap-2 px-3 transition-colors duration-200 hover:bg-surface"
  >
    <CalendarIcon className="size-3.5 text-brass-strong transition-colors duration-200 group-hover:text-ink" />

    <input
      type="date"
      value={selectedDateKey}
      onChange={(e) => {
        if (e.target.value) onDateChange(e.target.value);
      }}
      className="cursor-pointer bg-transparent text-center text-xs font-semibold text-mainText outline-none scheme-light dark:scheme-dark [&::-webkit-calendar-picker-indicator]:hidden"
    />
  </div>

  <button
    type="button"
    onClick={() => onShiftDate(1)}
    title="შემდეგი დღე"
    className="flex size-9 shrink-0 items-center justify-center border-l border-border/10 text-muted transition-all duration-200 hover:bg-surface hover:text-ink active:scale-95"
  >
    <ChevronRight className="size-4" />
  </button>
</div>
      </div>
    </>
  );
}
