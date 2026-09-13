'use client';

import { useTeacherWorkspaceNavigation } from './useTeacherWorkspaceNavigation';
import { useTeacherWorkspaceAssignments } from './useTeacherWorkspaceAssignments';
import { useTeacherWorkspaceModals } from './useTeacherWorkspaceModals';
import type { TeacherStudentsWorkspaceProps } from '../types/teacher-workspace.types';

export function useTeacherStudentsWorkspace({
  initialStudents = [],
  courses = [],
}: TeacherStudentsWorkspaceProps) {
  const nav = useTeacherWorkspaceNavigation({ initialStudents, courses });

  const assignments = useTeacherWorkspaceAssignments({
    activeStudent: nav.activeStudent,
    selectedDateKey: nav.selectedDateKey,
    setStudents: nav.setStudents,
    setSelectedDateKey: nav.setSelectedDateKey,
  });

  const modals = useTeacherWorkspaceModals(assignments.deletingAssignmentId);

  return {
    ...nav,
    ...assignments,
    ...modals,
    courses,
    handleStartClassCall: () => modals.handleStartClassCall(nav.activeCourseId, courses),
  };
}