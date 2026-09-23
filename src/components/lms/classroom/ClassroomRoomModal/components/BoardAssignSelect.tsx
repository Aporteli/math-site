'use client';

import { useBoardControlContext } from './BoardControlContext';

export function BoardAssignSelect({
  studentId,
  className = '',
}: {
  studentId: string;
  className?: string;
}) {
  const { pageCount, assignedPageByStudent, assignStudentPage } = useBoardControlContext();
  const assigned = assignedPageByStudent[studentId];
  const value = typeof assigned === 'number' ? String(assigned) : '';

  return (
    <label className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <select
        value={value}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const next = event.currentTarget.value;
          assignStudentPage(studentId, next === '' ? null : Number(next));
        }}
        className="min-w-0 flex-1 rounded-md border border-white/10 bg-slate-950 px-1.5 py-1 text-[11px] font-semibold text-white"
      >
        <option value="">დაფა</option>
        {Array.from({ length: Math.max(1, pageCount) }, (_, index) => (
          <option key={index} value={index}>
            დაფა {index + 1}
          </option>
        ))}
      </select>
    </label>
  );
}
