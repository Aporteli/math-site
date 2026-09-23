'use client';

import { useMemo, useRef, useState } from 'react';
import { Headphones, LogIn, Merge, Maximize2, RotateCcw, Split, Volume2, X } from 'lucide-react';
import type { BreakoutRoomKey } from '@/lib/livekit/breakout';
import { useBreakout } from './BreakoutContext';
import { useDraggableResizable } from './useDraggableResizable';
import { BoardAssignSelect } from '../components/BoardAssignSelect';

interface StudentOption {
  identity: string;
  name: string;
}

interface BreakoutDashboardProps {
  students: StudentOption[];
}

export function BreakoutDashboard({ students }: BreakoutDashboardProps) {
  const breakout = useBreakout();
  const containerRef = useRef<HTMLDivElement>(null);

  const { rect, startDrag, startResize, reset } = useDraggableResizable({
    initial: { x: 8, y: 56, width: 440, height: 560 },
    minWidth: 160,
    minHeight: 120,
    maxWidth: 900,
    maxHeight: 900,
    storageKey: 'breakout-dashboard-rect',
    boundsRef: containerRef,
  });

  const [maximized, setMaximized] = useState(false);

  // ⬇️ compact რეჟიმი — ვიწრო პანელზე ტექსტი იმალება
  const isCompact = rect.width < 340;

  if (!breakout.dashboardOpen) return null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <div
        className="pointer-events-auto absolute flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
        style={
          maximized
            ? {
                inset: '8px',
                width: 'auto',
                height: 'auto',
              }
            : {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              }
        }>
        {/* Header */}
        <div
          onPointerDown={maximized ? undefined : startDrag}
          className={`flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 ${
            maximized ? '' : 'cursor-grab select-none active:cursor-grabbing'
          }`}>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-bold text-white">ოთახები</p>

            <p className="truncate text-[11px] text-white/50">
              {breakout.breakout.active ? 'ჯგუფები გაყოფილია' : 'ყველა მთავარ ოთახშია'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={reset}
              title="საწყის პოზიციაზე დაბრუნება"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Reset">
              <RotateCcw className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMaximized((v) => !v)}
              title={maximized ? 'აღდგენა' : 'გაფართოება'}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Maximize">
              <Maximize2 className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => breakout.setDashboardOpen(false)}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="დახურვა">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
          {breakout.audioBlocked && (
            <button
              type="button"
              onClick={breakout.resumeMonitorAudio}
              className="mb-3 w-full rounded-xl bg-amber-500/20 px-3 py-2 text-left text-xs font-semibold leading-5 text-amber-200">
              მოსმენა დაბლოკილია ბრაუზერმა. დააჭირეთ ხმის ჩასართავად.
            </button>
          )}

          {breakout.breakout.active ? (
            <ActiveRooms students={students} compact={isCompact} />
          ) : (
            <AssignRooms students={students} />
          )}

          {breakout.actionError && (
            <p className="mt-3 break-words text-xs leading-5 text-rose-300">{breakout.actionError}</p>
          )}
        </div>

        {/* Resize handles */}
        {!maximized && (
          <>
            <div onPointerDown={startResize('n')} className="absolute left-3 right-3 top-0 h-1 cursor-ns-resize" />

            <div onPointerDown={startResize('s')} className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize" />

            <div onPointerDown={startResize('w')} className="absolute bottom-3 left-0 top-3 w-1 cursor-ew-resize" />

            <div onPointerDown={startResize('e')} className="absolute bottom-3 right-0 top-3 w-1 cursor-ew-resize" />

            <div onPointerDown={startResize('nw')} className="absolute left-0 top-0 size-3 cursor-nwse-resize" />

            <div onPointerDown={startResize('ne')} className="absolute right-0 top-0 size-3 cursor-nesw-resize" />

            <div onPointerDown={startResize('sw')} className="absolute bottom-0 left-0 size-3 cursor-nesw-resize" />

            <div onPointerDown={startResize('se')} className="absolute bottom-0 right-0 size-3 cursor-nwse-resize">
              <span className="pointer-events-none absolute bottom-1 right-1 size-1.5 rounded-sm bg-white/30" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AssignRooms
   ═══════════════════════════════════════════════════════════ */

function AssignRooms({ students }: { students: StudentOption[] }) {
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
        <p className="text-xs leading-5 text-white/40">ჩარიცხული მოსწავლეები ვერ მოიძებნა</p>
      ) : (
        <ul className="flex min-w-0 flex-col gap-1">
          {students.map((student) => (
            <li key={student.identity} className="flex min-w-0 items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">
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
        className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">
        <Split className="size-4 shrink-0" />
        <span className="truncate">გაყოფა</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RoomPick
   ═══════════════════════════════════════════════════════════ */

function RoomPick({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
        selected ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   ActiveRooms
   ═══════════════════════════════════════════════════════════ */

function ActiveRooms({ students, compact }: { students: StudentOption[]; compact: boolean }) {
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
        className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">
        <Merge className="size-4 shrink-0" />
        <span className="truncate">გაერთიანება</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RoomColumn — სათაური = მოსწავლეების სახელები
   ═══════════════════════════════════════════════════════════ */

function RoomColumn({
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
    <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="mb-2 flex min-w-0 flex-col gap-2">
        {/* სათაური: badge + მოსწავლეების სახელები */}
        <div className="flex min-w-0 items-center gap-1.5" title={fullTitle}>
          <span className="flex h-4 shrink-0 items-center rounded bg-white/10 px-1.5 text-[9px] font-bold text-white/70">
            {badge}
          </span>

          <h3 className="min-w-0 flex-1 truncate text-xs font-bold text-white">{displayTitle}</h3>
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

      {isJoined && (
        <p className="mb-2 break-words text-[10px] font-semibold leading-4 text-emerald-300">ლაპარაკობთ ამ ოთახში</p>
      )}

      {ids.length === 0 ? (
        <p className="text-[11px] leading-4 text-white/40">ცარიელია</p>
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

/* ═══════════════════════════════════════════════════════════
   StudentListenRow
   ═══════════════════════════════════════════════════════════ */

function StudentListenRow({
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
    <li className="min-w-0 overflow-hidden rounded-lg bg-slate-950/60 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {speaking && (
          <span className="hidden shrink-0 text-[9px] font-bold text-emerald-300 min-[360px]:inline">საუბრობს</span>
        )}
      </div>

      <BoardAssignSelect studentId={userId} className="mt-1.5" />

      <div className="mt-1 flex min-w-0 items-center gap-2">
        <Volume2 className="size-3 shrink-0 text-white/30" />

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          aria-label={`${name} ხმა`}
          onChange={(event) => setStudentVolume(userId, event.currentTarget.valueAsNumber / 100)}
          className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
        />

        <span className="w-7 shrink-0 text-right text-[9px] tabular-nums text-white/30">{volume}%</span>
      </div>
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════
   IconButton
   ═══════════════════════════════════════════════════════════ */

function IconButton({
  label,
  pressed,
  onClick,
  icon: Icon,
  compact,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon: typeof Headphones;
  /** true → მხოლოდ ხატულა, ტექსტი იმალება */
  compact: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex min-w-0 shrink-0 items-center justify-center gap-1 rounded-lg text-[10px] font-bold ${
        compact ? 'size-7 p-0' : 'px-2 py-1'
      } ${pressed ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
      <Icon className="size-3 shrink-0" />

      {!compact && <span className="truncate">{label}</span>}
    </button>
  );
}