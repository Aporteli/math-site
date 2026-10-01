'use client';

import { Users, BookOpen, CheckCircle2, Layers, UploadCloud } from 'lucide-react';
import { TeacherAssignmentCard } from './TeacherAssignmentCard';
import { isMaterialItem } from '../helpers/teacher-workspace.helpers';
import type { StudentAssignment, StudentItem, ContentTab } from '../types/teacher-workspace.types';

interface TeacherAssignmentsGridProps {
  activeStudent?: StudentItem;
  activeTab: ContentTab;
  assignments: StudentAssignment[];
  formattedSelectedDate: string;
  onOpenMaterialModal: () => void;
  onSelectAssignment: (assignment: StudentAssignment, mode: 'task' | 'answer') => void;
  onPreviewMaterial: (material: { url: string; title: string; instructions?: string | null }) => void;
  onDeleteAssignment: (id: string) => void;
}

export function TeacherAssignmentsGrid({
  activeStudent,
  activeTab,
  assignments,
  formattedSelectedDate,
  onOpenMaterialModal,
  onSelectAssignment,
  onPreviewMaterial,
  onDeleteAssignment,
}: TeacherAssignmentsGridProps) {
  const emptyCopy =
    activeTab === 'tasks'
      ? { icon: BookOpen, title: 'ამ თარიღისთვის დავალებები არ არის' }
      : activeTab === 'answers'
        ? { icon: CheckCircle2, title: 'მოსწავლის პასუხები ჯერ არ არის მიღებული' }
        : { icon: Layers, title: 'სასწავლო მასალები არ არის ატვირთული' };

  const EmptyIcon = emptyCopy.icon;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-main p-3">
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pe-1">
        {!activeStudent ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-box border border-dashed border-hairline bg-main px-6 py-16 text-center">
            <span className="mb-3 inline-flex size-12 items-center justify-center rounded-box  text-brass-strong">
              <Users className="size-8 " strokeWidth={2.5} />
            </span>
            <p className="text-mainText font-bold text-mainText">მოსწავლე არ არის არჩეული</p>
            <p className="mt-1 max-w-xs text-sm text-mainText">
              აირჩიეთ მოსწავლე ზედა ტაბებიდან, რათა შეამოწმოთ მისი პასუხები.
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-box border border-dashed border-hairline bg-main px-6 py-16 text-center">
            <span className="mb-3 inline-flex size-12 items-center justify-center text-navy">
              <EmptyIcon className="size-8" strokeWidth={2.5} />
            </span>
            <p className="text-sm font-bold text-ink">{emptyCopy.title}</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              {formattedSelectedDate}-ს ამ სექციაში მონაცემები არ მოიძებნა.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assignments.map((assignment) => {
              const isMaterial = isMaterialItem(assignment);

              return (
                <TeacherAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  activeTab={activeTab}
                  onSelect={() => {
                    if (isMaterial && assignment.problemImageUrl) {
                      onPreviewMaterial({
                        url: assignment.problemImageUrl,
                        title: assignment.title,
                        instructions: assignment.instructions,
                      });
                      return;
                    }
                    onSelectAssignment(assignment, activeTab === 'answers' ? 'answer' : 'task');
                  }}
                  onDelete={onDeleteAssignment}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
