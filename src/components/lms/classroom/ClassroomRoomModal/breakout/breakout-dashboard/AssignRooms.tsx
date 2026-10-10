'use client';

import { useState } from 'react';
import { Split } from 'lucide-react';
import { useBreakout } from '../BreakoutContext';
import { RoomPick } from './RoomPick';
import type { StudentOption } from './types';

export function AssignRooms({ students }: { students: StudentOption[] }) {
  const { busy, split } = useBreakout();
  const [group, setGroup] = useState<Record<string, 'a' | 'b'>>({});

  const assign = (userId: string, room: 'a' | 'b') => {
    setGroup((prev) => {
      const next = { ...prev };

      if (next[userId] === room) {
        delete next[userId];
      } else {
        next[userId] = room;
      }

      return next;
    });
  };

  const groupA = students.filter((student) => group[student.identity] === 'a').map((student) => student.identity);

  const groupB = students.filter((student) => group[student.identity] === 'b').map((student) => student.identity);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {students.length === 0 ? (
        <p className="text-xs font-medium leading-5 text-muted">ჩარიცხული მოსწავლეები ვერ მოიძებნა</p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-1">
          {students.map((student) => (
            <li
              key={student.identity}
              className="flex min-w-0 items-center gap-2 rounded-box border border-hairline bg-main px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-mainText">
                {student.name || student.identity}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <RoomPick
                  label="A"
                  selected={group[student.identity] === 'a'}
                  onClick={() => assign(student.identity, 'a')}
                />

                <RoomPick
                  label="B"
                  selected={group[student.identity] === 'b'}
                  onClick={() => assign(student.identity, 'b')}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={busy || (groupA.length === 0 && groupB.length === 0)}
        onClick={() => void split(groupA, groupB)}
        className="inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-box bg-[#A66A32] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
        <Split className="size-4 shrink-0" />
        <span className="truncate">გაყოფა</span>
      </button>
    </div>
  );
}
