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
        <div className="flex w-full shrink-0 items-center justify-end rounded-box border border-hairline p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => onShiftDate(-1)}
            title="წინა დღე"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box  transition hover:bg-mainButton hover:text-mainText">
            <ChevronLeft className="size-4" />
          </button>

          <div
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input');
              input?.showPicker?.();
            }}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 sm:flex-none">
            <CalendarIcon className="size-3.5 shrink-0 text-brass-strong" />
            <input
              type="date"
              value={selectedDateKey}
              onChange={(e) => {
                if (e.target.value) onDateChange(e.target.value);
              }}
              className="cursor-pointer bg-transparent text-center text-xs font-bold text-mainText outline-none [&::-webkit-calendar-picker-indicator]:hidden"
            />
          </div>

          <button
            type="button"
            onClick={() => onShiftDate(1)}
            title="შემდეგი დღე"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box  transition hover:bg-mainButton hover:text-mainText">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}
