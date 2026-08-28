'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Maximize, Minimize, Video } from 'lucide-react';
import { ClassroomRoomModal } from '@/components/lms/classroom/ClassroomRoomModal';

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
  showFullscreen = false,
}: StudentCourseVideoCallButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // კლიენტზე დარენდერების დაფიქსირება პორტალისთვის
  useEffect(() => {
    setMounted(true);
  }, []);

  // ბრაუზერის Fullscreen ივენთების კონტროლი (მაგ. Esc-ით გამოსვლისას)
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
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
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
      console.warn("Fullscreen toggle error:", err);
    }
  }, []);

  function handleOpen(mode: "normal" | "fullscreen") {
    setIsOpen(true);
    if (mode === "fullscreen") {
      void toggleFullscreen(true);
    }
  }

  function handleClose() {
    if (isFullscreen) {
      void toggleFullscreen(false);
    }
    setIsOpen(false);
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleOpen("normal")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95"
        >
          <Video className="size-3.5" />
          <span>{label ?? "გაკვეთილზე შესვლა"}</span>
        </button>

        {showFullscreen && (
          <button
            type="button"
            onClick={() => handleOpen("fullscreen")}
            aria-label="სრული ეკრანი"
            title="სრული ეკრანი"
            className="inline-flex size-8 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95"
          >
            {isFullscreen ? (
              <Minimize className="size-3.5" />
            ) : (
              <Maximize className="size-3.5" />
            )}
          </button>
        )}
      </div>

      {/* React Portal: მოდალი იხსნება document.body-ში და სცდება HeroPage-ის საზღვრებს */}
      {isOpen && mounted &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex h-screen w-screen bg-slate-900/90 backdrop-blur-sm">
            <ClassroomRoomModal
              courseId={courseId}
              courseTitle={courseTitle}
              onClose={handleClose}
              isTeacher={false}
            />
          </div>,
          document.body
        )}
    </>
  );
}