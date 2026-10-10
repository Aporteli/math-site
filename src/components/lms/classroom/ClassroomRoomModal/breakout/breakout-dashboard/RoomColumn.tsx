'use client';

import { useMemo } from 'react';
import { Headphones, LogIn } from 'lucide-react';
import type { BreakoutRoomKey } from '@/lib/livekit/breakout';
import { useBreakout } from '../BreakoutContext';
import { IconButton } from './IconButton';
import { StudentListenRow } from './StudentListenRow';

export function RoomColumn({
  roomKey,
  badge,
  ids,
  names,
  compact,
}: {
  roomKey: BreakoutRoomKey;
  /** პატარა ბეჯი A/B/მთავარი — ვიზუალური იდენტიფიკაციისთვის */
  badge: string;
  ids: string[];
  names: Map<string, string>;
  /** ვიწრო რეჟიმი — IconButton-ებზე ტექსტი იმალება */
  compact: boolean;
}) {
  const { joined, joinRoom, listen, peopleIn, toggleListen } = useBreakout();

  const online = new Map(peopleIn(roomKey).map((person) => [person.userId, person]));

  const canJoin = roomKey === 'a' || roomKey === 'b';
  const isJoined = canJoin && joined === roomKey;

  /* ─── სათაურის გამოთვლა მოსწავლეების სახელებიდან ─── */
  const displayTitle = useMemo(() => {
    if (ids.length === 0) return 'ცარიელია';

    const list = ids.map((id) => names.get(id) || 'მოსწავლე');

    // 1-2 მოსწავლე → ყველა სახელი
    if (list.length <= 2) return list.join(', ');

    // 3+ → პირველი 2 + "+N"
    return `${list.slice(0, 2).join(', ')} +${list.length - 2}`;
  }, [ids, names]);

  /* ─── Tooltip: სრული სია hover-ზე ─── */
  const fullTitle = useMemo(() => {
    if (ids.length === 0) return 'ცარიელია';
    return ids.map((id) => names.get(id) || 'მოსწავლე').join(', ');
  }, [ids, names]);

  return (
    <section className="min-w-0 overflow-hidden rounded-box border border-hairline bg-main p-2">
      <div className="mb-2 flex min-w-0 flex-col gap-2">
        {/* სათაური: badge + მოსწავლეების სახელები */}
        <div className="flex min-w-0 items-center gap-1.5" title={fullTitle}>
          <span className="flex h-4 shrink-0 items-center rounded-box bg-sectionHeader px-1.5 text-[9px] font-bold text-muted">
            {badge}
          </span>

          <h3 className="min-w-0 flex-1 truncate text-xs font-bold text-ink">{displayTitle}</h3>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <IconButton
            label="მოსმენა"
            pressed={listen[roomKey]}
            onClick={() => toggleListen(roomKey)}
            icon={Headphones}
            compact={compact}
          />

          {canJoin && (
            <IconButton
              label={isJoined ? 'გასვლა' : 'შესვლა'}
              pressed={isJoined}
              onClick={() => void joinRoom(roomKey)}
              icon={LogIn}
              compact={compact}
            />
          )}
        </div>
      </div>

      {isJoined && <p className="mb-2 break-words text-[10px] font-bold leading-4 text-win">ლაპარაკობთ ამ ოთახში</p>}

      {ids.length === 0 ? (
        <p className="text-[11px] font-medium leading-4 text-muted">ცარიელია</p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-1.5">
          {ids.map((userId) => (
            <StudentListenRow
              key={userId}
              userId={userId}
              name={names.get(userId) || 'მოსწავლე'}
              online={online.has(userId)}
              speaking={Boolean(online.get(userId)?.speaking)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
