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
    <div className="flex flex-col gap-3 border-b border-hairline bg-surface px-3 py-3 sm:flex-row sm:items-center sm:px-4">
      <div className="custom-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0">
        {studentsInActiveCourse.length === 0 ? (
          <p className="px-1 py-1 text-xs font-bold text-muted">ამ კლასში მოსწავლეები არ არიან</p>
        ) : (
          studentsInActiveCourse.map((student) => {
            const isSelected = selectedStudentId === student.id;
            const hasUnread = unreadStudentIds.has(student.id);
            const initial = student.name.trim().charAt(0) || '?';

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelectStudent(student.id)}
                className={`relative inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border py-1 pe-3.5 ps-1 text-xs font-bold transition ${
                  isSelected
                    ? 'border-navy bg-navy text-white shadow-sm'
                    : 'border-hairline bg-paper text-ink hover:border-navy/40 hover:bg-navy-tint'
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-navy-tint text-navy'
                  }`}
                >
                  {initial}
                </span>
                <span className="max-w-[9rem] truncate sm:max-w-[12rem]">{student.name}</span>
                {hasUnread ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-brass ring-2 ring-surface" />
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {activeStudent ? (
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
                if (e.target.value) setSelectedDateKey(e.target.value);
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
      ) : null}
    </div>
  );
}
