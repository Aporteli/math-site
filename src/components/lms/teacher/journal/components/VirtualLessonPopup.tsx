'use client';

import { Calendar as CalendarIcon, Clock, Users, X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { WEEKDAY_LABELS } from '../constants';
import { formatDateLabel } from '../journal-time';
import type { VirtualPopupState } from '../types';
import { virtualTitle } from '../virtual-labels';

interface VirtualLessonPopupProps {
  virtualPopup: VirtualPopupState | null;
  setVirtualPopup: Dispatch<SetStateAction<VirtualPopupState | null>>;
  onSaveMark: (eventId: string, dateKey: string, skippedStudentIds: string[], comment: string) => void;
}

export function VirtualLessonPopup({ virtualPopup, setVirtualPopup, onSaveMark }: VirtualLessonPopupProps) {
  if (!virtualPopup) return null;

  const skipped = virtualPopup.event.skippedStudentIds ?? [];
  const comment = virtualPopup.event.comment ?? '';

  function save(nextSkipped: string[], nextComment: string) {
    setVirtualPopup((prev) =>
      prev ? { ...prev, event: { ...prev.event, skippedStudentIds: nextSkipped, comment: nextComment } } : null,
    );
    onSaveMark(virtualPopup!.event.id, virtualPopup!.dateKey, nextSkipped, nextComment);
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setVirtualPopup(null)} />
      <div
        style={{ top: virtualPopup.anchor.top, left: virtualPopup.anchor.left }}
        className="fixed z-50 thin-scrollbar max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-box border border-hairline bg-paper p-4 shadow-2xl animate-in fade-in zoom-in-95">
        <div
          className={`mb-3 h-1.5 w-full rounded-box ${virtualPopup.event.source === 'group' ? 'bg-sky-500' : 'bg-amber-400'}`}
        />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className={`inline-block rounded-box px-1.5 py-0.5 text-[10px] font-bold ${virtualPopup.event.source === 'group' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-900'}`}>
              {virtualPopup.event.source === 'group'
                ? 'ჯგუფური'
                : virtualPopup.event.source === 'home'
                  ? 'სახლში'
                  : 'ინდივიდუალური'}
            </span>
            <h4 className="mt-1.5 truncate text-sm font-bold text-ink">{virtualTitle(virtualPopup.event)}</h4>
          </div>
          <button
            type="button"
            aria-label="დახურვა"
            onClick={() => setVirtualPopup(null)}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-muted transition-colors hover:bg-sectionHeader hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 space-y-2 text-xs text-ink">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-3.5 shrink-0 text-brass-strong" />
            <span className="font-medium">
              {WEEKDAY_LABELS[virtualPopup.event.dayOfWeek - 1]}, {formatDateLabel(virtualPopup.dateKey)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 shrink-0 text-brass-strong" />
            <span className="font-medium tabular-nums">
              {virtualPopup.event.startTime} – {virtualPopup.event.endTime}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 size-3.5 shrink-0 text-brass-strong" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[11px] font-bold text-muted">მოსწავლეები ({virtualPopup.event.students.length})</p>
              {virtualPopup.event.students.map((s) => {
                const isSkipped = skipped.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const next = isSkipped ? skipped.filter((id) => id !== s.id) : [...skipped, s.id];
                      save(next, comment);
                    }}
                    className={`block w-full cursor-pointer truncate text-left text-xs font-medium ${
                      isSkipped ? 'text-ink' : 'text-ink'
                    }`}>
                    <span className={isSkipped ? 'rounded-box bg-red-600 px-0.5 text-white' : undefined}>{s.name}</span>
                    </button>
                );
              })}
            </div>
          </div>
          <textarea
            value={comment}
            rows={2}
            placeholder="კომენტარი"
            onChange={(e) =>
              setVirtualPopup((prev) => (prev ? { ...prev, event: { ...prev.event, comment: e.target.value } } : null))
            }
            onBlur={(e) => save(skipped, e.target.value)}
            className="w-full resize-none rounded-box border border-hairline bg-main px-2 py-1.5 text-xs text-ink outline-none"
          />
        </div>
      </div>
    </>
  );
}
