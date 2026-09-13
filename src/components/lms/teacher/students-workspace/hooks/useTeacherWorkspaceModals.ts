'use client';

import { useState, useEffect } from 'react';
import type { StudentAssignment } from '../types/teacher-workspace.types';

export function useTeacherWorkspaceModals(deletingAssignmentId: string | null) {
  const [activeAssignmentModal, setActiveAssignmentModal] = useState<{
    assignment: StudentAssignment;
    studentName: string;
    mode: 'task' | 'answer';
  } | null>(null);

  const [previewMaterialModal, setPreviewMaterialModal] = useState<{
    url: string;
    title: string;
    instructions?: string | null;
  } | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [activeVideoCallCourse, setActiveVideoCallCourse] = useState<{ id: string; title: string } | null>(null);

  const isAnyModalOpen = Boolean(
    deletingAssignmentId ||
    activeAssignmentModal ||
    previewMaterialModal ||
    isAssignModalOpen ||
    isMaterialModalOpen ||
    activeVideoCallCourse,
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isAnyModalOpen]);

  const handleStartClassCall = (activeCourseId: string | 'all', courses: { id: string; title: string }[]) => {
    if (activeCourseId !== 'all') {
      const current = courses.find((c) => c.id === activeCourseId);
      if (current) setActiveVideoCallCourse(current);
    } else if (courses.length > 0) {
      setActiveVideoCallCourse(courses[0]);
    } else {
      alert('ვიდეო გაკვეთილის დასაწყებად საჭიროა მინიმუმ ერთი აქტიური კლასი.');
    }
  };

  return {
    activeAssignmentModal,
    setActiveAssignmentModal,
    previewMaterialModal,
    setPreviewMaterialModal,
    isAssignModalOpen,
    setIsAssignModalOpen,
    isMaterialModalOpen,
    setIsMaterialModalOpen,
    activeVideoCallCourse,
    setActiveVideoCallCourse,
    handleStartClassCall,
  };
}