'use client';

import { useMemo } from 'react';
import { Merge } from 'lucide-react';
import { useBreakout } from '../BreakoutContext';
import { RoomColumn } from './RoomColumn';
import type { StudentOption } from './types';

export function ActiveRooms({ students, compact }: { students: StudentOption[]; compact: boolean }) {
  const { breakout, busy, merge, peopleIn } = useBreakout();

  const names = useMemo(() => {
    const map = new Map(students.map((student) => [student.identity, student.name]));

    for (const key of ['main', 'a', 'b'] as const) {
      for (const person of peopleIn(key)) {
        if (!map.has(person.userId)) {
          map.set(person.userId, person.name);
        }
      }
    }

    return map;
  }, [peopleIn, students]);

  const unassigned = students
    .map((student) => student.identity)
    .filter((id) => !breakout.a.includes(id) && !breakout.b.includes(id));

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <RoomColumn roomKey="a" badge="A" ids={breakout.a} names={names} compact={compact} />

        <RoomColumn roomKey="b" badge="B" ids={breakout.b} names={names} compact={compact} />
      </div>

      {unassigned.length > 0 && (
        <RoomColumn roomKey="main" badge="მთავარი" ids={unassigned} names={names} compact={compact} />
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => void merge()}
        className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-box bg-[#465D73] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
        <Merge className="size-4 shrink-0" />
        <span className="truncate">გაერთიანება</span>
      </button>
    </div>
  );
}
