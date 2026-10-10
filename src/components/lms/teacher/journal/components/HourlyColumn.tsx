'use client';

import { Repeat, Users } from 'lucide-react';
import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { COLOR_CHIP, HOUR_HEIGHT, HOURS } from '../constants';
import { isSameDay, pad, timeToMinutes, toDateKey } from '../journal-time';
import type {
  DragPreview,
  EventClickHandler,
  EventPointerDownHandler,
  EventPointerHandler,
  JournalEvent,
  OpenCreateHandler,
  OpenVirtualHandler,
} from '../types';
import { virtualChipClass, virtualStudentsLabel, virtualTitle, virtualTooltip } from '../virtual-labels';

interface HourlyColumnProps {
  date: Date;
  dayIndex: number;
  isLast?: boolean;
  dayEvents: JournalEvent[];
  dayVirtual: VirtualScheduleEvent[];
  today: Date;
  dragPreview: DragPreview | null;
  onOpenCreate: OpenCreateHandler;
  onOpenVirtual: OpenVirtualHandler;
  onEventPointerDown: EventPointerDownHandler;
  onEventPointerMove: EventPointerHandler;
  onEventPointerUp: EventPointerHandler;
  onEventClick: EventClickHandler;
}

export function HourlyColumn({
  date,
  dayIndex,
  isLast = false,
  dayEvents,
  dayVirtual,
  today,
  dragPreview,
  onOpenCreate,
  onOpenVirtual,
  onEventPointerDown,
  onEventPointerMove,
  onEventPointerUp,
  onEventClick,
}: HourlyColumnProps) {
  const dateKey = toDateKey(date);
  const isToday = isSameDay(date, today);
  const currentMinutes = today.getHours() * 60 + today.getMinutes();

  return (
    <div
      data-day-column
      data-day-index={dayIndex}
      data-date-key={dateKey}
      className={`relative w-full h-full select-none ${!isLast ? 'border-r border-hairline' : ''}`}>
      {HOURS.map((hour) => (
        <div
          key={hour}
          style={{ height: `${HOUR_HEIGHT}px` }}
          onClick={(e) => onOpenCreate(e.currentTarget, date, hour)}
          className="relative cursor-pointer border-b border-hairline/60 transition-colors hover:bg-sectionHeader group">
          <div className="absolute inset-x-1 top-1 hidden h-5 items-center justify-center rounded-box bg-mainButton text-[10px] font-bold text-mainText group-hover:flex">
            + {pad(hour)}:00
          </div>
        </div>
      ))}

      {isToday && (
        <div
          style={{ top: `${(currentMinutes / 60) * HOUR_HEIGHT}px` }}
          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center">
          <div className="size-2 rounded-box bg-rose-500 -ml-1" />
          <div className="h-[2px] w-full bg-rose-500" />
        </div>
      )}

      {/* ─── Virtual schedule lessons (Google Calendar style, below manual) ─── */}
      {dayVirtual.map((v) => {
        const startMin = timeToMinutes(v.startTime);
        const endMin = Math.max(startMin + 30, timeToMinutes(v.endTime));
        const top = (startMin / 60) * HOUR_HEIGHT;
        const height = Math.max(26, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);

        return (
          <div
            key={v.id}
            style={{ top: `${top}px`, height: `${height}px` }}
            title={virtualTooltip(v)}
            onClick={(e) => {
              e.stopPropagation();
              onOpenVirtual(e.currentTarget, v, dateKey);
            }}
            className={`absolute inset-x-1 z-[5] overflow-hidden rounded-box p-1.5 text-xs leading-tight cursor-pointer active:scale-[0.98] ${virtualChipClass(v.source)}`}>
            <div className="flex items-center gap-1 font-semibold">
              <span className="truncate text-[12px]">{virtualTitle(v)}</span>
              {v.students.length > 1 ? (
                <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] opacity-80 shrink-0">
                  <Users className="size-3" />
                  {v.students.length}
                </span>
              ) : null}
            </div>
            <div className="text-[10px] opacity-70 font-normal tabular-nums mt-0.5">
              {v.startTime} – {v.endTime}
            </div>
            {v.source !== 'individual' ? (
              <div className="text-[10px] opacity-70 font-normal truncate mt-0.5">{virtualStudentsLabel(v)}</div>
            ) : null}
          </div>
        );
      })}

      {/* ─── Manual events (above) ─── */}
      {dayEvents.map((ev) => {
        if (ev.allDay) return null;
        const startMin = timeToMinutes(ev.startTime);
        const endMin = Math.max(startMin + 30, timeToMinutes(ev.endTime));
        const top = (startMin / 60) * HOUR_HEIGHT;
        const height = Math.max(26, ((endMin - startMin) / 60) * HOUR_HEIGHT - 2);
        const isDragging = dragPreview?.id === ev.id;

        const displayStart = isDragging ? dragPreview!.startTime : ev.startTime;
        const displayEnd = isDragging ? dragPreview!.endTime : ev.endTime;
        const participantCount = ev.participants?.length ?? 0;

        return (
          <div
            key={`${ev.id}-${dateKey}`}
            onPointerDown={(e) => onEventPointerDown(e, ev, dateKey)}
            onPointerMove={onEventPointerMove}
            onPointerUp={onEventPointerUp}
            onPointerCancel={onEventPointerUp}
            onClick={(e) => onEventClick(e, ev)}
            style={{
              top: `${top}px`,
              height: `${height}px`,
              touchAction: 'none',
              transform: isDragging ? `translate(${dragPreview!.dx}px, ${dragPreview!.dy}px)` : undefined,
            }}
            className={`absolute inset-x-1 z-10 overflow-hidden rounded-box border p-1.5 text-xs font-bold leading-tight shadow-md cursor-grab active:cursor-grabbing transition-all ${
              isDragging
                ? 'pointer-events-none z-50 shadow-2xl transition-none ring-2 ring-white/70'
                : 'hover:z-30 hover:scale-[1.01]'
            } ${COLOR_CHIP[ev.color]}`}>
            <div className="flex items-center gap-1">
              {ev.repeat !== 'none' && <Repeat className="text-black size-3 shrink-0 opacity-75" />}
              <span className="text-black text-[15px] truncate">{ev.title || '(უსათაურო)'}</span>
              {participantCount > 0 && (
                <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-black/80 shrink-0">
                  <Users className="size-3" />
                  {participantCount}
                </span>
              )}
            </div>
            <div className="text-[12px] opacity-80 font-normal tabular-nums text-black">
              {displayStart} - {displayEnd}
            </div>
          </div>
        );
      })}
    </div>
  );
}
