'use client';

import type { Student } from '../../utils/types';
import { StudentRow } from './StudentRow';

interface StudentListProps {
  students: Student[];
  lockedStudentIds: Set<string>;
  onToggleLock: (identity: string) => void;
  isDark: boolean;
}

export function StudentList({
  students,
  lockedStudentIds,
  onToggleLock,
  isDark,
}: StudentListProps) {
  if (students.length === 0) {
    return (
      <p
        className={`px-2 py-4 text-center text-xs ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        ამჟამად კლასში მოსწავლეები არ არიან დაკავშირებული.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {students.map((s) => (
        <StudentRow
          key={s.identity}
          student={s}
          locked={lockedStudentIds.has(s.identity)}
          onToggleLock={onToggleLock}
          isDark={isDark}
        />
      ))}
    </ul>
  );
}