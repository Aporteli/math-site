'use client';

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { StudentItem } from '../types/teacher-workspace.types';

interface TeacherWorkspaceHeaderProps {
  studentsInActiveCourse: StudentItem[];
  selectedStudentId: string | null;
  unreadStudentIds: Set<string>;
  onSelectStudent: (studentId: string) => void;
  activeStudent?: StudentItem;
  selectedDateKey: string;
  setSelectedDateKey: (date: string) => void;
  onShiftDate: (days: number) => void;
}

export function TeacherWorkspaceHeader({
  studentsInActiveCourse,
  selectedStudentId,
  unreadStudentIds,
  onSelectStudent,
  activeStudent,
  selectedDateKey,
  setSelectedDateKey,
  onShiftDate,
}: TeacherWorkspaceHeaderProps) {
  return (
    <>
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <div className="flex h-auto shrink-0 flex-col gap-2 border-b border-hairline bg-sectionHeader px-3 py-2 sm:h-18 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-0">
        <div className="custom-scrollbar flex max-h-36 min-w-0 flex-1 flex-col gap-1 overflow-y-auto sm:max-h-none sm:flex-row sm:items-center sm:gap-2 sm:overflow-x-auto sm:overflow-y-visible">
          {studentsInActiveCourse.length === 0 ? (
            <p className="px-1 py-1 text-xs font-bold text-mainText">ამ კლასში მოსწავლეები არ არიან</p>
          ) : (
            studentsInActiveCourse.map((student) => {
              const isSelected = selectedStudentId === student.id;
              const hasUnread = unreadStudentIds.has(student.id);
              const initial = student.name.trim().charAt(0) || '?';

              return (
                <>
                <button
                  key={student.id}
                  type="button"
                  onClick={() => onSelectStudent(student.id)}
                  className={`relative inline-flex w-full shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap p-2 text-left text-xs font-bold transition-all duration-300 ease-in-out sm:w-auto ${
                    isSelected ? ' text-navy-strong sm:translate-y-[-10px] sm:scale-110' : ' text-mainText  hover:text-navy-strong/40 '
                  }`}>
                  <span className="max-w-[9rem] truncate sm:max-w-[12rem]">{student.name}</span>

                  {hasUnread ? (
                    <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-box bg-brass ring-2 ring-surface" />
                  ) : null}
                </button>
                </>
              );
            })
          )}
        </div>

        {activeStudent ? (
          <div className="flex w-full shrink-0 items-center rounded-box border border-hairline bg-main p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => onShiftDate(-1)}
              title="წინა დღე"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink">
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
                  if (e.target.value) setSelectedDateKey(e.target.value);
                }}
                className="cursor-pointer bg-transparent text-center text-xs font-bold text-ink outline-none scheme-light dark:scheme-dark [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => onShiftDate(1)}
              title="შემდეგი დღე"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition hover:bg-surface hover:text-ink">
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
