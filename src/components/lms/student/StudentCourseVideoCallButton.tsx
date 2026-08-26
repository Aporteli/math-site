'use client';

import { useState } from 'react';
import { Video } from 'lucide-react';
import { ClassroomRoomModal } from '@/components/lms/classroom/ClassroomRoomModal';

interface StudentCourseVideoCallButtonProps {
  courseId: string;
  courseTitle: string;
}

export function StudentCourseVideoCallButton({
  courseId,
  courseTitle,
}: StudentCourseVideoCallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95"
      >
        <Video className="size-3.5" />
        <span>გაკვეთილზე შესვლა</span>
      </button>

      {isOpen && (
        <ClassroomRoomModal
          courseId={courseId}
          courseTitle={courseTitle}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}