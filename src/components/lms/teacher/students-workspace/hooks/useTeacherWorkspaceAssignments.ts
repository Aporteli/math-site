'use client';

import { useState, useMemo } from 'react';
import { deleteTargetedAssignmentAction } from '@/lib/actions/teacher-students';
import { formatDateToKey, isMaterialItem } from '../helpers/teacher-workspace.helpers';
import type { StudentItem, StudentAssignment, ContentTab } from '../types/teacher-workspace.types';

interface UseTeacherWorkspaceAssignmentsProps {
  activeStudent?: StudentItem;
  selectedDateKey: string;
  setStudents: React.Dispatch<React.SetStateAction<StudentItem[]>>;
  setSelectedDateKey: (date: string) => void;
}

export function useTeacherWorkspaceAssignments({
  activeStudent,
  selectedDateKey,
  setStudents,
  setSelectedDateKey,
}: UseTeacherWorkspaceAssignmentsProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>('tasks');
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const assignmentsForSelectedDate = useMemo(() => {
    if (!activeStudent || !activeStudent.assignments) return [];
    return activeStudent.assignments.filter((assignment) => {
      return formatDateToKey(new Date(assignment.createdAt)) === selectedDateKey;
    });
  }, [activeStudent, selectedDateKey]);

  const filteredTabAssignments = useMemo(() => {
    if (activeTab === 'answers') {
      return assignmentsForSelectedDate.filter(
        (a) =>
          !isMaterialItem(a) && (Boolean(a.studentAttachmentUrl) || a.status === 'SUBMITTED' || a.status === 'GRADED'),
      );
    }
    if (activeTab === 'materials') {
      return assignmentsForSelectedDate.filter((a) => isMaterialItem(a));
    }
    return assignmentsForSelectedDate.filter((a) => !isMaterialItem(a));
  }, [assignmentsForSelectedDate, activeTab]);

  const answersCountForDate = useMemo(
    () =>
      assignmentsForSelectedDate.filter(
        (a) =>
          !isMaterialItem(a) && (Boolean(a.studentAttachmentUrl) || a.status === 'SUBMITTED' || a.status === 'GRADED'),
      ).length,
    [assignmentsForSelectedDate],
  );

  const materialsCountForDate = useMemo(
    () => assignmentsForSelectedDate.filter((a) => isMaterialItem(a)).length,
    [assignmentsForSelectedDate],
  );

  const tasksCountForDate = useMemo(
    () => assignmentsForSelectedDate.filter((a) => !isMaterialItem(a)).length,
    [assignmentsForSelectedDate],
  );

  const formattedSelectedDate = useMemo(() => {
    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDateKey]);

  const handleAssignmentCreated = (newAssignment: StudentAssignment) => {
    if (!activeStudent) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === activeStudent.id ? { ...s, assignments: [newAssignment, ...s.assignments] } : s)),
    );
    setSelectedDateKey(formatDateToKey(new Date()));
  };

  const handleMaterialUploaded = (newMaterial: StudentAssignment) => {
    if (!activeStudent) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === activeStudent.id ? { ...s, assignments: [newMaterial, ...s.assignments] } : s)),
    );
    setSelectedDateKey(formatDateToKey(new Date()));
    setActiveTab('materials');
  };

  async function handleConfirmDelete() {
    if (!deletingAssignmentId) return;
    setIsDeleting(true);
    const res = await deleteTargetedAssignmentAction(deletingAssignmentId);
    setIsDeleting(false);

    if (res.success) {
      setStudents((prev) =>
        prev.map((student) => ({
          ...student,
          assignments: student.assignments.filter((a) => a.id !== deletingAssignmentId),
        })),
      );
      setDeletingAssignmentId(null);
    } else {
      alert(res.error || 'წაშლა ვერ მოხერხდა');
    }
  }

  return {
    activeTab,
    setActiveTab,
    filteredTabAssignments,
    tasksCountForDate,
    answersCountForDate,
    materialsCountForDate,
    formattedSelectedDate,
    deletingAssignmentId,
    setDeletingAssignmentId,
    isDeleting,
    handleConfirmDelete,
    handleAssignmentCreated,
    handleMaterialUploaded,
  };
}