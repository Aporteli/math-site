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
    <div className="bg-surface border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* მოსწავლეების ტაბები */}
      <div className="flex-1 overflow-x-auto flex items-center gap-1.5 custom-scrollbar min-w-0 pb-0.5 sm:pb-0">
        {studentsInActiveCourse.length === 0 ? (
          <p className="py-1 px-1 text-xs font-bold text-muted">ამ კლასში მოსწავლეები არ არიან</p>
        ) : (
          studentsInActiveCourse.map((student) => {
            const isSelected = selectedStudentId === student.id;
            const hasUnread = unreadStudentIds.has(student.id);

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelectStudent(student.id)}
                className={`group relative flex items-center gap-2 shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-surface border-hairline/90 shadow-inner'
                    : 'bg-transparent border-transparent hover:bg-surface/50 text-body hover:text-ink'
                }`}>
                <span className={`truncate max-w-[120px] sm:max-w-none transition-colors ${isSelected ? 'text-ink' : ''}`}>
                  {student.name}
                </span>
                {hasUnread && <span className="size-2 rounded-full bg-orange-500 ring-2 ring-surface shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* ზედა კალენდარი */}
      {activeStudent && (
        <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 w-full sm:w-auto">
          <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 bg-brass-tint/30 hover:bg-brass-tint/50 px-2.5 py-1.5 rounded-xl border border-brass/25 shadow-inner transition-colors w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onShiftDate(-1)}
              title="წინა დღე"
              className="flex size-7 items-center justify-center rounded-lg hover:bg-paper-deep text-muted hover:text-ink transition-colors shrink-0 cursor-pointer">
              <ChevronLeft className="size-4" />
            </button>

            <div
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                input?.showPicker?.();
              }}
              className="group flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl hover:bg-surface transition-colors cursor-pointer flex-1 sm:flex-none">
              <CalendarIcon className="size-3.5 text-brass-strong group-hover:text-brass shrink-0 transition-colors" />
              <input
                type="date"
                value={selectedDateKey}
                onChange={(e) => {
                  if (e.target.value) setSelectedDateKey(e.target.value);
                }}
                className="text-xs font-bold text-ink bg-transparent outline-none cursor-pointer text-center [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => onShiftDate(1)}
              title="შემდეგი დღე"
              className="flex size-7 items-center justify-center rounded-lg hover:bg-paper-deep text-muted hover:text-ink transition-colors shrink-0 cursor-pointer">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}