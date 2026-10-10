//CUT

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, LockOpen, PenLine, Shield, ShieldAlert, Volume2 } from 'lucide-react';
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
  const { lockedStudentIds, toggleStudentLock, drawingStudentIds, toggleStudentDraw } = useBoardControlContext();
  const { getVolume, setVolume } = useAudioVolume();
  // Board lock is tracked per account; volume stays per live connection.
  const studentUserId = student ? participantUserId(student) : null;
  const isLocked = studentUserId ? lockedStudentIds.has(studentUserId) : false;
  const canDraw = studentUserId ? drawingStudentIds.has(studentUserId) : false;
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
      className="pointer-events-auto z-[88888] min-w-[180px] rounded-box border border-hairline bg-main p-3 text-xs text-mainText shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}>
      <p className="mb-2 font-bold text-navy">{student.name || student.identity}</p>

      <div className="flex flex-col gap-1.5 border-t border-hairline pt-2">
        {isTeacher && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleIsolation(student.identity);
            }}
            className={`flex w-full cursor-pointer items-center justify-between rounded-box px-2 py-1.5 text-left font-bold transition-colors duration-200 ${
              isIsolated
                ? 'border border-rose-500/30 bg-rose-500/15 text-rose-500 hover:bg-rose-500/25'
                : 'border border-hairline bg-sectionHeader text-mainText hover:bg-mainButtonHover'
            }`}>
            <span>{isIsolated ? 'იზოლაციის მოხსნა' : 'იზოლირება'}</span>
            {isIsolated ? (
              <ShieldAlert className="size-3.5 text-rose-500" />
            ) : (
              <Shield className="size-3.5 text-icons" />
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
            className={`flex w-full cursor-pointer items-center justify-between rounded-box px-2 py-1.5 text-left font-bold transition-colors duration-200 ${
              isLocked
                ? 'border border-transparent bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                : 'border border-hairline bg-sectionHeader text-mainText hover:bg-mainButtonHover'
            }`}>
            <span>{isLocked ? 'დაფის მართვა ჩართულია' : 'დაფის მართვა'}</span>
            {isLocked ? (
              <Lock className="size-3.5" />
            ) : (
              <LockOpen className="size-3.5 text-icons" />
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
              toggleStudentDraw(participantUserId(student));
            }}
            aria-pressed={canDraw}
            title="ხატვის ხელსაწყოები ამ მოსწავლისთვის"
            className={`flex w-full cursor-pointer items-center justify-between rounded-box px-2 py-1.5 text-left font-bold transition-colors duration-200 ${
              canDraw
                ? 'border border-transparent bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                : 'border border-hairline bg-sectionHeader text-mainText hover:bg-mainButtonHover'
            }`}>
            <span>{canDraw ? 'ხატვა ჩართულია' : 'ხატვის ხელსაწყოები'}</span>
            <PenLine className={`size-3.5 ${canDraw ? '' : 'text-icons'}`} />
          </button>
        )}

        {isTeacher && studentUserId && (
          <div className="rounded-box border border-hairline bg-sectionHeader px-2 py-1.5">
            <BoardAssignSelect studentId={studentUserId} />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-box border border-hairline bg-sectionHeader px-2 py-1.5">
          <Volume2 className="size-3.5 shrink-0 text-icons" />
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
            className="h-1 w-full cursor-pointer appearance-none rounded-box bg-paper-deep accent-[#465D73]"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[10px] font-bold text-muted">
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
          className="w-full cursor-pointer rounded-box border border-hairline bg-sectionHeader px-2 py-1.5 text-left font-bold text-mainText transition-colors duration-200 hover:bg-mainButtonHover">
          პროფილის ნახვა
        </button>
      </div>
    </div>,
    document.body,
  );
}