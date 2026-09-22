'use client';

import { BookOpen, Loader2 } from 'lucide-react';
import type { Assignment, AssignmentProblem } from '../types/student-assignment.types';
import { AssignmentTaskCard } from './AssignmentTaskCard';

interface AssignmentTasksTabProps {
  loading: boolean;
  taskAssignments: Assignment[];
  formattedSelectedDate: string;
  onSelectProblem: (payload: { assignmentId: string; problem: AssignmentProblem }) => void;
}

export function AssignmentTasksTab({
  loading,
  taskAssignments,
  formattedSelectedDate,
  onSelectProblem,
}: AssignmentTasksTabProps) {
  return (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-paper p-3 pe-2 sm:p-4">
      {loading ? (
        <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-surface text-sm font-semibold text-muted">
          <Loader2 className="size-6 animate-spin text-navy" />
          <span>იტვირთება...</span>
        </div>
      ) : taskAssignments.length === 0 ? (
        <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
          <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-hairline bg-navy-tint text-navy">
            <BookOpen className="size-5" />
          </span>
          <p className="text-sm font-bold text-ink">ამ თარიღისთვის დავალებები არ არის</p>
          <p className="mt-1 max-w-xs text-xs text-muted">{formattedSelectedDate}-ს დავალებები არ მოიძებნა.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {taskAssignments.map((assignment) => (
            <AssignmentTaskCard key={assignment.id} assignment={assignment} onSelectProblem={onSelectProblem} />
          ))}
        </div>
      )}
    </div>
  );
}
