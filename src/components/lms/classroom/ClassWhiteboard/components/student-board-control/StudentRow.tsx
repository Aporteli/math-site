'use client';

import type { Student } from '../../utils/types';
import { LockButton } from './LockButton';

interface StudentRowProps {
  student: Student;
  locked: boolean;
  onToggleLock: (identity: string) => void;
  isDark: boolean;
}

export function StudentRow({ student, locked, onToggleLock, isDark }: StudentRowProps) {
  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 ${
        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
      }`}
    >
      <span
        className={`truncate text-sm font-medium ${
          isDark ? 'text-slate-200' : 'text-slate-700'
        }`}
      >
        {student.name}
      </span>

      <LockButton
        locked={locked}
        onClick={() => onToggleLock(student.identity)}
        isDark={isDark}
      />
    </li>
  );
}