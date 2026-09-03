'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Video, Loader2 } from 'lucide-react';
import { ClassroomRoomModal } from '@/components/lms/classroom/ClassroomRoomModal';
import { checkTeacherInRoom } from '@/lib/actions/room';

interface StudentCourseVideoCallButtonProps {
  courseId: string;
  courseTitle: string;
  label?: string;
  showFullscreen?: boolean;
}

export function StudentCourseVideoCallButton({
  courseId,
  courseTitle,
  label,
}: StudentCourseVideoCallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isTeacherPresent, setIsTeacherPresent] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check teacher presence on mount, then poll every 10 seconds
  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function check() {
      if (cancelled) return;
      try {
        const present = await checkTeacherInRoom(courseId);
        if (!cancelled) {
          setIsTeacherPresent(present);
          setChecking(false);
          // If teacher is present, stop polling
          if (present) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check teacher presence:', error);
        if (!cancelled) {
          setIsTeacherPresent(false);
          setChecking(false);
        }
      }
    }

    // Initial check
    if (courseId) {
      check();
    }

    // Set up polling every 10 seconds
    intervalRef.current = setInterval(() => {
      check();
    }, 10000);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [courseId]);

  // Scroll lock when modal opens
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  // Fullscreen events
  useEffect(() => {
    function handleFullscreenChange() {
      const activeElement =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      setIsFullscreen(Boolean(activeElement));
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async (targetState?: boolean) => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement,
      );

      const shouldBeFullscreen = targetState ?? !isCurrentlyFullscreen;

      if (shouldBeFullscreen && !isCurrentlyFullscreen) {
        const elem = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };

        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      } else if (!shouldBeFullscreen && isCurrentlyFullscreen) {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
        };

        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
  }, []);

  function handleOpen(mode: 'normal' | 'fullscreen') {
    if (!isTeacherPresent) return;
    setIsOpen(true);
    if (mode === 'fullscreen') {
      void toggleFullscreen(true);
    }
  }

  function handleClose() {
    if (isFullscreen) {
      void toggleFullscreen(false);
    }
    setIsOpen(false);
  }

  // Button disabled if still checking, or teacher not present
  const disabled = checking || isTeacherPresent === false;

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpen('normal')}
        disabled={disabled}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.99] ${
          disabled
            ? 'cursor-not-allowed bg-slate-400 hover:bg-slate-400'
            : 'bg-navy hover:bg-navy-strong'
        }`}
      >
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

      {isOpen && mounted &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex h-[100dvh] w-screen overflow-hidden bg-slate-900/90 backdrop-blur-sm">
            <ClassroomRoomModal courseId={courseId} courseTitle={courseTitle} onClose={handleClose} isTeacher={false} />
          </div>,
          document.body,
        )}
    </>
  );
}