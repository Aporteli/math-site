'use client';

import { Volume2 } from 'lucide-react';
import { BoardAssignSelect } from '../../components/BoardAssignSelect';
import { useBreakout } from '../BreakoutContext';

export function StudentListenRow({
  userId,
  name,
  online,
  speaking,
}: {
  userId: string;
  name: string;
  online: boolean;
  speaking: boolean;
}) {
  const { setStudentVolume, studentVolume } = useBreakout();
  const volume = Math.round(studentVolume(userId) * 100);

  return (
    <li className="min-w-0 overflow-hidden rounded-box border border-hairline bg-sectionHeader px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {speaking && <span className="hidden shrink-0 text-[9px] font-bold text-win min-[360px]:inline">საუბრობს</span>}
      </div>

      <BoardAssignSelect studentId={userId} className="mt-1.5" />

      <div className="mt-1 flex min-w-0 items-center gap-2">
        <Volume2 className="size-3 shrink-0 text-icons" />

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          aria-label={`${name} ხმა`}
          onChange={(event) => setStudentVolume(userId, event.currentTarget.valueAsNumber / 100)}
          className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-box bg-paper-deep accent-[#465D73]"
        />

        <span className="w-7 shrink-0 text-right text-[9px] font-bold tabular-nums text-muted">{volume}%</span>
      </div>
    </li>
  );
}
