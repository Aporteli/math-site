"use client";

import type { Room } from "livekit-client";
import { ClassWhiteboard } from "./ClassWhiteboardDynamic";

interface ClassroomWhiteboardPanelProps {
  room: Room | null;
  courseId: string;
  courseTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher: boolean;
}

export function ClassroomWhiteboardPanel({
  room,
  courseId,
  courseTitle,
  isFullscreen,
  onToggleFullscreen,
  isTeacher,
}: ClassroomWhiteboardPanelProps) {
  return (
    <div className="relative flex flex-1 h-full min-h-0 min-w-0 overflow-hidden rounded-xl bg-white">
      <ClassWhiteboard
        room={room}
        courseId={courseId}
        courseTitle={courseTitle}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        isTeacher={isTeacher}
      />
    </div>
  );
}