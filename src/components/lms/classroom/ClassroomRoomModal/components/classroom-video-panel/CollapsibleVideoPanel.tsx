'use client';

import { useState } from 'react';
import type { Room } from 'livekit-client';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ClassroomVideoPanel } from './ClassroomVideoPanel';

interface CollapsibleVideoPanelProps {
  token: string;
  courseId: string;
  isTeacher: boolean;
  secondary: boolean;
  onClose: () => void;
  onRoom: (room: Room) => void;
  /** Hides the panel (used by the "board" tab) while keeping it mounted. */
  hidden: boolean;
  expanded: boolean;
}

export function CollapsibleVideoPanel({
  token,
  courseId,
  isTeacher,
  secondary,
  onClose,
  onRoom,
  hidden,
  expanded = false,
}: CollapsibleVideoPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const Icon = collapsed ? ChevronsRight : ChevronsLeft;

  const width = hidden
    ? 'hidden'
    : expanded
      ? 'w-full min-w-0 flex-1'
      : collapsed
        ? 'w-full shrink-0 lg:w-[140px]'
        : 'w-full shrink-0 lg:w-[260px] xl:w-[300px]';

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm transition-all duration-300 ease-in-out ${width}`}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'პანელის გაშლა' : 'პანელის ჩაკეცვა'}
        className="absolute top-2 right-2 z-20 flex size-7 cursor-pointer items-center justify-center rounded-box border border-hairline bg-sectionHeader text-mainText transition-all duration-200 hover:bg-mainButtonHover active:scale-[0.98]">
        <Icon className="h-4 w-4" />
      </button>

      <ClassroomVideoPanel
        token={token}
        courseId={courseId}
        isTeacher={isTeacher}
        secondary={secondary}
        onClose={onClose}
        onRoom={onRoom}
        expanded={expanded}
      />
    </div>
  );
}
