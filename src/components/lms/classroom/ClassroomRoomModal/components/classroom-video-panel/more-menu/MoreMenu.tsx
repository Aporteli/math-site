'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRemoteParticipants } from '@livekit/components-react';
import { BlurToggleButton } from '@/components/ui/blur-toggle-button/BlurToggleButton';
import { VirtualBackgroundControl } from '@/components/ui/virtual-background/VirtualBackgroundControl';
import { isAuxiliaryParticipant, isStaffParticipant } from '@/lib/livekit/participant-identity';
import { TemporalBackgroundTunerButton } from '../TemporalBackgroundTuner';
import { StudentsList } from './StudentsList';
import type { MoreMenuProps } from './types';

/** Matches Tailwind `bottom-11`: sit just above the toolbar button. */
const MENU_GAP_PX = 44;

interface MenuPosition {
  right: number;
  bottom: number;
}

function readMenuPosition(anchor: HTMLElement): MenuPosition {
  const rect = anchor.getBoundingClientRect();
  return {
    right: window.innerWidth - rect.right,
    bottom: window.innerHeight - rect.bottom + MENU_GAP_PX,
  };
}

export function MoreMenu({
  anchorRef,
  courseId,
  isTeacher,
  isolatedIdentities,
  onIsolationChange,
}: MoreMenuProps) {
  const participants = useRemoteParticipants();
  // Staff connections (another teacher/admin, or the teacher's own second device)
  // are not students.
  const students = participants.filter(
    (participant) => !isStaffParticipant(participant) && !isAuxiliaryParticipant(participant),
  );
  const [position, setPosition] = useState<MenuPosition | null>(() => {
    const anchor = anchorRef.current;
    return anchor ? readMenuPosition(anchor) : null;
  });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const update = () => {
      const next = readMenuPosition(anchor);
      setPosition((prev) =>
        prev && prev.right === next.right && prev.bottom === next.bottom ? prev : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    let node: HTMLElement | null = anchor;
    while (node) {
      observer.observe(node);
      node = node.parentElement;
    }
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef]);

  if (!position || typeof document === 'undefined') return null;

  const portalRoot =
    anchorRef.current?.closest('[data-classroom-root]') ?? document.body;

  // Portaled to the classroom root (not document.body). Students wrap the
  // room in a z-[999999] overlay; a body portal at z-60 paints behind it.
  return createPortal(
    <div
      className="fixed z-[200] flex w-72 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl overflow-visible"
      style={{ right: position.right, bottom: position.bottom }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">
        პარამეტრები
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90">
        <span className="font-medium">ფონის ბლური</span>
        <BlurToggleButton />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90">
        <span className="font-medium">ვირტუალური ფონი</span>
        <VirtualBackgroundControl />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90 relative">
        <span className="font-medium">მასკის დახვეწა</span>
        <TemporalBackgroundTunerButton />
      </div>

      <StudentsList
        participants={students}
        isTeacher={isTeacher}
        isolatedIdentities={isolatedIdentities}
        onIsolationChange={onIsolationChange}
      />
    </div>,
    portalRoot,
  );
}