'use client';

import type { CanvasElement } from '../../KonvaCanvas/utils/types';
import type { Student } from '../utils/types';
import type { useAssign } from '../hooks/useAssign';
import { AssignModal } from './AssignModal';

interface Props {
  isTeacher: boolean;
  pages: CanvasElement[][];
  isDark: boolean;
  currentPageIndex: number;
  students: Student[];
  assign: ReturnType<typeof useAssign>;
}

export function TeacherAssignModal({ isTeacher, pages, isDark, currentPageIndex, students, assign }: Props) {
  if (!isTeacher || !assign.isAssignModalOpen) return null;
  return (
    <AssignModal
      pages={pages}
      isDark={isDark}
      currentPageIndex={currentPageIndex}
      students={students}
      selectedPagesForAssign={assign.selectedPagesForAssign}
      selectedStudentIdentities={assign.selectedStudentIdentities}
      assignedStatus={assign.assignedStatus}
      assignError={assign.assignError}
      assignPending={assign.assignPending}
      assignTargetType={assign.assignTargetType}
      onClose={() => {
        assign.setIsAssignModalOpen(false); /* assignError null */
      }}
      onTogglePage={assign.togglePageSelectionForAssign}
      onSelectAllPagesToggle={() => {
        if (assign.selectedPagesForAssign.length === pages.length) assign.setSelectedPagesForAssign([currentPageIndex]);
        else assign.setSelectedPagesForAssign(pages.map((_, i) => i));
      }}
      onToggleStudent={assign.toggleStudentSelection}
      onSelectAllStudents={assign.selectAllStudents}
      onAssign={assign.handleAssignSelectedBoards}
    />
  );
}
