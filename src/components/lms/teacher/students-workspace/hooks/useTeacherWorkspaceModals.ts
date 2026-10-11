'use client';

import { useState, useEffect } from 'react';
import { createLessonMeetAction, getLessonRoomAction } from '@/lib/actions/lesson-room';
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
  const [meetPending, setMeetPending] = useState(false);
  const [meetMessage, setMeetMessage] = useState<string | null>(null);

  const isAnyModalOpen = Boolean(
    deletingAssignmentId || activeAssignmentModal || previewMaterialModal || isAssignModalOpen || isMaterialModalOpen,
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

  const handleStartClassCall = async (activeCourseId: string | 'all', courses: { id: string; title: string }[]) => {
    setMeetMessage(null);
    const course = activeCourseId !== 'all' ? courses.find((item) => item.id === activeCourseId) : courses[0];
    if (!course) {
      setMeetMessage('ვიდეო გაკვეთილის დასაწყებად საჭიროა მინიმუმ ერთი აქტიური კლასი.');
      return;
    }

    const tab = window.open('', '_blank');
    if (!tab) {
      setMeetMessage('ბრაუზერმა ახალი ფანჯრის გახსნა დაბლოკა.');
      return;
    }

    setMeetPending(true);
    try {
      const loaded = await getLessonRoomAction(course.id);
      if (!loaded.ok) {
        tab.close();
        setMeetMessage(loaded.error);
        return;
      }

      let meetUrl = loaded.room.meetUrl;
      if (!meetUrl) {
        const created = await createLessonMeetAction(course.id);
        if (!created.ok) {
          tab.close();
          setMeetMessage(created.error);
          return;
        }
        meetUrl = created.room.meetUrl;
      }
      if (!meetUrl) {
        tab.close();
        setMeetMessage('ამ ჯგუფს Meet-ის ბმული ჯერ არ აქვს.');
        return;
      }

      tab.opener = null;
      tab.location.href = meetUrl;
    } catch {
      tab.close();
      setMeetMessage('Meet-ის ბმულის გახსნა ვერ მოხერხდა.');
    } finally {
      setMeetPending(false);
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
    meetPending,
    meetMessage,
    handleStartClassCall,
  };
}
