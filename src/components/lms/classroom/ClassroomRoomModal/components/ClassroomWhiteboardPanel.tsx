'use client';

import type { Room } from 'livekit-client';
import { ClassWhiteboard } from './ClassWhiteboardDynamic';
import type { Student } from '../../ClassWhiteboard/utils/types';

interface ClassroomWhiteboardPanelProps {
  room: Room | null;
  courseId: string;
  courseTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher: boolean;
  students: Student[];
  enableSlashPrompts?: boolean;
  slashPromptsUserId?: string;
  hidden?: boolean;
}

export function ClassroomWhiteboardPanel({
  room,
  courseId,
  courseTitle,
  isFullscreen,
  onToggleFullscreen,
  isTeacher,
  students,
  enableSlashPrompts = false,
  slashPromptsUserId = '',
  hidden = false,
}: ClassroomWhiteboardPanelProps) {
  return (
    <div
      className={`relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-box bg-main ${
        hidden ? 'hidden' : ''
      }`}>
      {' '}
      <ClassWhiteboard
        room={room}
        courseId={courseId}
        courseTitle={courseTitle}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        isTeacher={isTeacher}
        students={students}
        enableSlashPrompts={enableSlashPrompts}
        slashPromptsUserId={slashPromptsUserId}
      />
    </div>
  );
}
