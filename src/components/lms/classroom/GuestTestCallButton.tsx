"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { ClassroomRoomModal } from "./ClassroomRoomModal";

export function GuestTestCallButton() {
  const [isOpen, setIsOpen] = useState(false);
  const testCourseId = "cmt9s4bwb0013zkmdjlc7sb7y"; // თქვენი კურსის ID

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-2xl transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95 animate-bounce"
        >
          <Video className="size-5" />
          <span>სატესტო ზარში შესვლა</span>
        </button>
      </div>

      {isOpen && (
        <ClassroomRoomModal
          courseId={testCourseId}
          courseTitle="სატესტო გაკვეთილი"
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}