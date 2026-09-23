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
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/5 bg-slate-950/80 transition-all duration-300 ease-in-out ${width}`}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'პანელის გაშლა' : 'პანელის ჩაკეცვა'}
        className="absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white">
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
