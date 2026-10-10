'use client';

import { Plus, Repeat, Users } from 'lucide-react';
import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { COLOR_CHIP } from '../constants';
import { isSameDay, toDateKey } from '../journal-time';
import type { EventClickHandler, JournalEvent, OpenCreateHandler, OpenVirtualHandler } from '../types';
import { virtualChipClass, virtualTitle, virtualTooltip } from '../virtual-labels';

interface MonthDayCellProps {
  date: Date;
  inMonth: boolean;
  dayEvents: JournalEvent[];
  dayVirtual: VirtualScheduleEvent[];
  today: Date;
  onOpenCreate: OpenCreateHandler;
  onEventClick: EventClickHandler;
  onOpenVirtual: OpenVirtualHandler;
}

export function MonthDayCell({
  date,
  inMonth,
  dayEvents,
  dayVirtual,
  today,
  onOpenCreate,
  onEventClick,
  onOpenVirtual,
}: MonthDayCellProps) {
  const dateKey = toDateKey(date);
  const isToday = isSameDay(date, today);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => onOpenCreate(e.currentTarget, date)}
      className={`group relative flex h-full cursor-pointer flex-col gap-1 overflow-hidden border-b border-r border-hairline p-1.5 text-left transition-colors hover:bg-sectionHeader focus:outline-none ${
        !inMonth ? 'bg-paper/20' : ''
      }`}>
      <div className="flex items-center justify-between shrink-0">
        <span
          className={`flex size-6 items-center justify-center rounded-box text-xs font-bold ${
            isToday ? 'bg-[#465D73] text-white' : inMonth ? 'text-ink' : 'text-muted/40'
          }`}>
          {date.getDate()}
        </span>
        <span className="hidden size-4 shrink-0 items-center justify-center rounded-box bg-mainButton text-mainText group-hover:flex">
          <Plus className="size-2.5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 min-w-0 overflow-y-auto no-scrollbar">
        {/* ─── Manual events ─── */}
        {dayEvents.map((ev) => (
          <div
            key={`${ev.id}-${dateKey}`}
            onClick={(e) => onEventClick(e, ev)}
            className={`relative truncate rounded px-1.5 py-0.5 text-[11px] font-bold leading-tight transition-transform origin-left hover:scale-[1.02] shrink-0 shadow-2xs flex items-center gap-1 ${COLOR_CHIP[ev.color]}`}>
            {ev.repeat !== 'none' && <Repeat className="size-2.5 shrink-0 opacity-75 text-brass-strong" />}
            {!ev.allDay && <span className="opacity-80 font-normal">{ev.startTime}</span>}
            <span className="truncate">{ev.title || '(უსათაურო)'}</span>
            {(ev.participants?.length ?? 0) > 0 && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] opacity-90 shrink-0">
                <Users className="size-2.5" />
                {ev.participants!.length}
              </span>
            )}
          </div>
        ))}

        {/* ─── Virtual schedule lessons (Google Calendar style) ─── */}
        {dayVirtual.map((v) => (
          <div
            key={v.id}
            title={virtualTooltip(v)}
            onClick={(e) => {
              e.stopPropagation();
              onOpenVirtual(e.currentTarget, v, dateKey);
            }}
            className={`relative truncate rounded-box px-1.5 py-0.5 text-[10px] font-medium leading-tight shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${virtualChipClass(v.source)}`}>
            <span className="opacity-70 font-normal tabular-nums shrink-0">{v.startTime}</span>
            <span className="truncate">{virtualTitle(v)}</span>
            {v.students.length > 1 ? (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] opacity-80 shrink-0">
                <Users className="size-2.5" />
                {v.students.length}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
