'use client';

import { useRemoteParticipants } from '@livekit/components-react';
import { BlurToggleButton } from '@/components/ui/blur-toggle-button/BlurToggleButton';
import { VirtualBackgroundControl } from '@/components/ui/virtual-background/VirtualBackgroundControl';
import { isAuxiliaryParticipant, isStaffParticipant } from '@/lib/livekit/participant-identity';
import { TemporalBackgroundTunerButton } from '../TemporalBackgroundTuner';
import { StudentsList } from './StudentsList';
import type { MoreMenuProps } from './types';

export function MoreMenu({
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

  return (
    <div
      className="absolute bottom-11 right-0 z-50 flex w-72 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl overflow-visible"
      onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}