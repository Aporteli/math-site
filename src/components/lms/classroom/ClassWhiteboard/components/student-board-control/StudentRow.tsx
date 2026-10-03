'use client';

import type { Student } from '../../utils/types';
import { LockButton } from './LockButton';

interface StudentRowProps {
  student: Student;
  locked: boolean;
  onToggleLock: (identity: string) => void;
}

export function StudentRow({ student, locked, onToggleLock }: StudentRowProps) {
  return (
    <li
      className="flex items-center justify-between gap-2 rounded-box px-2 py-1.5 hover:bg-sectionHeader"
    >
      <span className="truncate text-sm font-bold text-mainText">
        {student.name}
      </span>

      <LockButton
        locked={locked}
        onClick={() => onToggleLock(student.identity)}
      />
    </li>
  );
}