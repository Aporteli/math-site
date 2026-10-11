'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Video } from 'lucide-react';
import { LessonRoom } from '@/components/lms/lesson-room/LessonRoom';

interface StudentCourseVideoCallButtonProps {
  courseId: string;
  courseTitle: string;
  label?: string;
}

export function StudentCourseVideoCallButton({ courseId, courseTitle, label }: StudentCourseVideoCallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-box bg-[#465D73] px-3 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
        <Video className="size-5" />
        <span className="text-[16px]">{label ?? 'გაკვეთილზე შესვლა'}</span>
      </button>

      {isOpen && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[999999] flex h-[100dvh] w-screen overflow-hidden">
              <LessonRoom courseId={courseId} courseTitle={courseTitle} onClose={() => setIsOpen(false)} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
