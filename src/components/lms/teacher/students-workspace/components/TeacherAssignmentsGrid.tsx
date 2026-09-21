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
  return (
    <div className="flex-1 flex flex-col bg-navy-tint/20 min-h-0 p-3.5 sm:p-5">
      <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
        {!activeStudent ? (
          <div className="py-24 flex flex-col items-center justify-center text-center text-muted">
            <Users className="size-12 opacity-50 mb-3 text-brass/50" />
            <p className="text-base font-bold text-ink">მოსწავლე არ არის არჩეული</p>
            <p className="text-xs max-w-xs mt-1 text-muted">
              აირჩიეთ მოსწავლე ზედა ტაბებიდან, რათა შეამოწმოთ მისი პასუხები.
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center text-muted">
            {activeTab === 'tasks' ? (
              <>
                <BookOpen className="size-9 opacity-50 mb-2 text-brass/50" />
                <p className="text-sm font-bold text-ink">ამ თარიღისთვის დავალებები არ არის</p>
              </>
            ) : activeTab === 'answers' ? (
              <>
                <CheckCircle2 className="size-9 opacity-80 mb-2 text-emerald-500/50" />
                <p className="text-sm font-bold text-ink">მოსწავლის პასუხები ჯერ არ არის მიღებული</p>
              </>
            ) : (
              <>
                <Layers className="size-9 opacity-70 mb-2 text-brass-strong/50" />
                <p className="text-sm font-bold text-ink">სასწავლო მასალები არ არის ატვირთული</p>
                <button
                  type="button"
                  onClick={onOpenMaterialModal}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-navy text-white px-4 py-2 text-xs font-bold hover:bg-navy-strong transition-colors shadow-xs cursor-pointer">
                  <UploadCloud className="size-3.5" />
                  <span>ატვირთეთ პირველი მასალა</span>
                </button>
              </>
            )}
            <p className="text-xs max-w-xs mt-1 text-muted">
              {formattedSelectedDate}-ს ამ სექციაში მონაცემები არ მოიძებნა.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
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