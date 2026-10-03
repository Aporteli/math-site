'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Video, Loader2 } from 'lucide-react';
import { ClassroomRoomModal } from '@/components/lms/classroom/ClassroomRoomModal/components/ClassroomRoomModal';
import { checkTeacherInRoom } from '@/lib/actions/room';

interface StudentCourseVideoCallButtonProps {
  courseId: string;
  courseTitle: string;
  label?: string;
}

export function StudentCourseVideoCallButton({ courseId, courseTitle, label }: StudentCourseVideoCallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isTeacherPresent, setIsTeacherPresent] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const teacherSeenRef = useRef(false);
  const handleTeacherLeftRef = useRef<() => void>(() => {});

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    let missingPolls = 0;

    async function check() {
      let present = false;
      try {
        present = await checkTeacherInRoom(courseId);
      } catch {
        present = false;
      }
      if (cancelled) return;

      setIsTeacherPresent(present);
      setChecking(false);

      if (present) {
        missingPolls = 0;
        teacherSeenRef.current = true;
        return;
      }

      missingPolls += 1;
      if (teacherSeenRef.current && missingPolls >= 2) handleTeacherLeftRef.current();
    }

    if (courseId) void check();
    const id = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [courseId]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleTeacherLeft = useCallback(() => {
    teacherSeenRef.current = false;
    setIsTeacherPresent(false);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    handleTeacherLeftRef.current = handleTeacherLeft;
  }, [handleTeacherLeft]);

  const disabled = checking || isTeacherPresent === false;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          teacherSeenRef.current = false;
          setIsOpen(true);
        }}
        disabled={disabled}
        className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-box bg-[#465D73] px-3 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:bg-[#465D73] disabled:hover:shadow-none">
        {checking ? (
          <Loader2 className="size-5 animate-spin" />
        ) : isTeacherPresent === false ? (
          <span className="text-xs">მასწავლებელი ჯერ არ არის შესული</span>
        ) : (
          <>
            <Video className="size-5" />
            <span className="text-[16px]">{label ?? 'გაკვეთილზე შესვლა'}</span>
          </>
        )}
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex h-[100dvh] w-screen overflow-hidden bg-black/60 backdrop-blur-sm">
            <ClassroomRoomModal
              courseId={courseId}
              courseTitle={courseTitle}
              onClose={() => setIsOpen(false)}
              onTeacherLeft={handleTeacherLeft}
              isTeacher={false}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
