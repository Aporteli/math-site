//CUT

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, LockOpen, Shield, ShieldAlert, Volume2 } from 'lucide-react';
import { participantUserId } from '@/lib/livekit/participant-identity';
import type { StudentModalProps } from './types';
import { useBoardControlContext } from '../../BoardControlContext';
import { BoardAssignSelect } from '../../BoardAssignSelect';
import { useAudioVolume } from '../AudioVolumeContext';

export function StudentModal({
  open,
  onClose,
  position,
  student,
  isTeacher,
  isIsolated,
  onToggleIsolation,
}: StudentModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { lockedStudentIds, toggleStudentLock } = useBoardControlContext();
  const { getVolume, setVolume } = useAudioVolume();
  // Board lock is tracked per account; volume stays per live connection.
  const studentUserId = student ? participantUserId(student) : null;
  const isLocked = studentUserId ? lockedStudentIds.has(studentUserId) : false;
  const volume = student ? getVolume(student.identity) : 1;
  const volumePercent = Math.round(volume * 100);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;

    const el = modalRef.current;
    if (!el) return;

    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener('mousedown', stop);
    el.addEventListener('pointerdown', stop);

    const handlePointerDown = (event: PointerEvent) => {
      if (el.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      el.removeEventListener('mousedown', stop);
      el.removeEventListener('pointerdown', stop);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, mounted, onClose]);

  if (!open || !mounted || !student) return null;

  return createPortal(
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translateY(-100%)', // <--- მთავარი ცვლილება: აფართოებს ზემოთ
      }}
      className="z-[88888] min-w-[180px] rounded-xl border border-white/10 bg-slate-800 p-3 shadow-2xl text-xs text-white pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}>
      <p className="font-semibold text-emerald-400">{student.name || student.identity}</p>

      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
        {isTeacher && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleIsolation(student.identity);
            }}
            className={`flex items-center justify-between w-full rounded-lg px-2 py-1.5 transition text-left font-medium ${
              isIsolated
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-white/5 text-white/80 hover:bg-white/10'
            }`}>
            <span>{isIsolated ? 'იზოლაციის მოხსნა' : 'იზოლირება'}</span>
            {isIsolated ? (
              <ShieldAlert className="size-3.5 text-red-400" />
            ) : (
              <Shield className="size-3.5 text-white/40" />
            )}
          </button>
        )}

        {isTeacher && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleStudentLock(participantUserId(student));
            }}
            aria-pressed={isLocked}
            className={`flex items-center justify-between w-full rounded-lg px-2 py-1.5 transition text-left font-medium ${
              isLocked
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                : 'bg-white/5 text-white/80 hover:bg-white/10'
            }`}>
            <span>{isLocked ? 'დაფის მართვა ჩართულია' : 'დაფის მართვა'}</span>
            {isLocked ? (
              <Lock className="size-3.5 text-indigo-400" />
            ) : (
              <LockOpen className="size-3.5 text-white/40" />
            )}
          </button>
        )}

        {isTeacher && studentUserId && (
          <div className="rounded-lg bg-white/5 px-2 py-1.5">
            <BoardAssignSelect studentId={studentUserId} />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
          <Volume2 className="size-3.5 shrink-0 text-white/40" />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volumePercent}
            aria-label="ხმის სიმძლავრე"
            onChange={(e) => {
              if (student) setVolume(student.identity, e.currentTarget.valueAsNumber / 100);
            }}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-indigo-500"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[10px] text-white/60">
            {volumePercent}%
          </span>
        </div>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            alert(`მოქმედება სტუდენტზე: ${student.identity}`);
            onClose();
          }}
          className="w-full rounded-lg bg-white/5 px-2 py-1.5 text-left text-white/80 hover:bg-white/10 transition">
          პროფილის ნახვა
        </button>
      </div>
    </div>,
    document.body,
  );
}