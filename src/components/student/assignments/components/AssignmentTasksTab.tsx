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
    <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-muted">
          <Loader2 className="size-6 animate-spin text-navy" />
          <span>იტვირთება...</span>
        </div>
      ) : taskAssignments.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
          <BookOpen className="size-9 opacity-30 mb-2" />
          <p className="text-sm font-bold text-ink">ამ თარიღისთვის დავალებები არ არის</p>
          <p className="text-xs max-w-xs mt-1">{formattedSelectedDate}-ს დავალებები არ მოიძებნა.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {taskAssignments.map((assignment) => (
            <AssignmentTaskCard key={assignment.id} assignment={assignment} onSelectProblem={onSelectProblem} />
          ))}
        </div>
      )}
    </div>
  );
}
