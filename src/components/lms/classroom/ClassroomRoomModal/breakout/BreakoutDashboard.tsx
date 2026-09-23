'use client';

import { useMemo, useState } from 'react';
import { Headphones, LogIn, Merge, Split, Volume2, VolumeX, X } from 'lucide-react';
import type { BreakoutRoomKey } from '@/lib/livekit/breakout';
import { useBreakout } from './BreakoutContext';

interface StudentOption {
  identity: string;
  name: string;
}

interface BreakoutDashboardProps {
  students: StudentOption[];
}

export function BreakoutDashboard({ students }: BreakoutDashboardProps) {
  const breakout = useBreakout();
  if (!breakout.dashboardOpen) return null;

  return (
    <div className="absolute top-14 left-2 z-40 flex max-h-[calc(100%-4.5rem)] w-[min(100%-1rem,440px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-white">ოთახები</p>
          <p className="text-[11px] text-white/50">
            {breakout.breakout.active ? 'ჯგუფები გაყოფილია' : 'ყველა მთავარ ოთახშია'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => breakout.setDashboardOpen(false)}
          className="flex size-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="დახურვა"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {breakout.audioBlocked && (
          <button
            type="button"
            onClick={breakout.resumeMonitorAudio}
            className="mb-3 w-full rounded-xl bg-amber-500/20 px-3 py-2 text-left text-xs font-semibold text-amber-200"
          >
            მოსმენა დაბლოკილია ბრაუზერმა. დააჭირეთ ხმის ჩასართავად.
          </button>
        )}

        {breakout.breakout.active ? (
          <ActiveRooms students={students} />
        ) : (
          <AssignRooms students={students} />
        )}

        {breakout.actionError && (
          <p className="mt-3 text-xs text-rose-300">{breakout.actionError}</p>
        )}
      </div>
    </div>
  );
}

function AssignRooms({ students }: { students: StudentOption[] }) {
  const { busy, split } = useBreakout();
  const [group, setGroup] = useState<Record<string, 'a' | 'b'>>({});

  const assign = (userId: string, room: 'a' | 'b') => {
    setGroup((prev) => {
      const next = { ...prev };
      if (next[userId] === room) delete next[userId];
      else next[userId] = room;
      return next;
    });
  };

  const groupA = students.filter((student) => group[student.identity] === 'a').map((student) => student.identity);
  const groupB = students.filter((student) => group[student.identity] === 'b').map((student) => student.identity);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/60">მოსწავლე აირჩიეთ ოთახი A-ში ან B-ში, შემდეგ დააჭირეთ გაყოფას.</p>
      {students.length === 0 ? (
        <p className="text-xs text-white/40">ჩარიცხული მოსწავლეები ვერ მოიძებნა</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {students.map((student) => (
            <li key={student.identity} className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">
                {student.name || student.identity}
              </span>
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
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={busy || (groupA.length === 0 && groupB.length === 0)}
        onClick={() => void split(groupA, groupB)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40"
      >
        <Split className="size-4" />
        გაყოფა
      </button>
    </div>
  );
}

function RoomPick({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
        selected ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );
}

function ActiveRooms({ students }: { students: StudentOption[] }) {
  const { breakout, busy, merge, peopleIn } = useBreakout();
  const names = useMemo(() => {
    const map = new Map(students.map((student) => [student.identity, student.name]));
    for (const key of ['main', 'a', 'b'] as const) {
      for (const person of peopleIn(key)) {
        if (!map.has(person.userId)) map.set(person.userId, person.name);
      }
    }
    return map;
  }, [peopleIn, students]);

  const unassigned = students
    .map((student) => student.identity)
    .filter((id) => !breakout.a.includes(id) && !breakout.b.includes(id));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <RoomColumn roomKey="a" title="ოთახი A" ids={breakout.a} names={names} />
        <RoomColumn roomKey="b" title="ოთახი B" ids={breakout.b} names={names} />
      </div>
      {unassigned.length > 0 && (
        <RoomColumn roomKey="main" title="მთავარი ოთახი" ids={unassigned} names={names} />
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void merge()}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40"
      >
        <Merge className="size-4" />
        გაერთიანება
      </button>
    </div>
  );
}

function RoomColumn({
  roomKey,
  title,
  ids,
  names,
}: {
  roomKey: BreakoutRoomKey;
  title: string;
  ids: string[];
  names: Map<string, string>;
}) {
  const { joined, joinRoom, listen, peopleIn, toggleListen } = useBreakout();
  const online = new Map(peopleIn(roomKey).map((person) => [person.userId, person]));
  const canJoin = roomKey === 'a' || roomKey === 'b';
  const isJoined = canJoin && joined === roomKey;

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="mb-2 flex items-center justify-between gap-1">
        <h3 className="text-xs font-bold text-white">{title}</h3>
        <div className="flex gap-1">
          <IconButton
            label="მოსმენა"
            pressed={listen[roomKey]}
            onClick={() => toggleListen(roomKey)}
            icon={Headphones}
          />
          {canJoin && (
            <IconButton
              label={isJoined ? 'გასვლა' : 'შესვლა'}
              pressed={isJoined}
              onClick={() => void joinRoom(roomKey)}
              icon={LogIn}
            />
          )}
        </div>
      </div>
      {isJoined && <p className="mb-2 text-[10px] font-semibold text-emerald-300">ლაპარაკობთ ამ ოთახში</p>}
      {canJoin && !isJoined && listen[roomKey] && (
        <p className="mb-2 text-[10px] text-white/40">მხოლოდ მოსმენა — მოსწავლეები თქვენს ხმას ვერ ისმენენ</p>
      )}
      {ids.length === 0 ? (
        <p className="text-[11px] text-white/40">ცარიელია</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
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
  const { isMuted, setStudentVolume, studentVolume, toggleStudentMute } = useBreakout();
  const muted = isMuted(userId);
  const volume = Math.round(studentVolume(userId) * 100);

  return (
    <li className="rounded-lg bg-slate-950/60 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${speaking ? 'bg-emerald-400' : online ? 'bg-white/40' : 'bg-white/15'}`} />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white">{name}</span>
        {speaking && <span className="text-[9px] font-bold text-emerald-300">საუბრობს</span>}
        <button
          type="button"
          title={muted ? 'ხმის ჩართვა' : 'დადუმება'}
          onClick={() => toggleStudentMute(userId)}
          className={`flex size-6 items-center justify-center rounded-md ${
            muted ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-white/70'
          }`}
        >
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={volume}
        aria-label={`${name} ხმა`}
        onChange={(event) => setStudentVolume(userId, event.currentTarget.valueAsNumber / 100)}
        className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
      />
    </li>
  );
}

function IconButton({
  label,
  pressed,
  onClick,
  icon: Icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon: typeof Headphones;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-bold ${
        pressed ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}
