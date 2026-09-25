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
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.99] ${
          disabled ? 'cursor-not-allowed bg-slate-400 hover:bg-slate-400' : 'bg-navy hover:bg-navy-strong'
        }`}>
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
          <div className="fixed inset-0 z-[999999] flex h-[100dvh] w-screen overflow-hidden bg-slate-900/90 backdrop-blur-sm">
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
