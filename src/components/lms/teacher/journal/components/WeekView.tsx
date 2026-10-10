'use client';

import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { WEEKDAY_LABELS } from '../constants';
import { isSameDay, toDateKey } from '../journal-time';
import type {
  CalendarCell,
  DragPreview,
  EventClickHandler,
  EventPointerDownHandler,
  EventPointerHandler,
  JournalEvent,
  OpenCreateHandler,
  OpenVirtualHandler,
} from '../types';
import { HourGutter } from './HourGutter';
import { HourlyColumn } from './HourlyColumn';

interface WeekViewProps {
  weekGrid: CalendarCell[];
  eventsByDate: Record<string, JournalEvent[]>;
  virtualByDate: Record<string, VirtualScheduleEvent[]>;
  today: Date;
  dragPreview: DragPreview | null;
  onOpenCreate: OpenCreateHandler;
  onOpenVirtual: OpenVirtualHandler;
  onEventPointerDown: EventPointerDownHandler;
  onEventPointerMove: EventPointerHandler;
  onEventPointerUp: EventPointerHandler;
  onEventClick: EventClickHandler;
}

export function WeekView({
  weekGrid,
  eventsByDate,
  virtualByDate,
  today,
  dragPreview,
  onOpenCreate,
  onOpenVirtual,
  onEventPointerDown,
  onEventPointerMove,
  onEventPointerUp,
  onEventClick,
}: WeekViewProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar relative">
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] min-w-full">
        <div className="sticky top-0 z-30 bg-paper/95 backdrop-blur-xs border-b border-r border-hairline h-14" />
        {weekGrid.map(({ date }, idx) => {
          const isToday = isSameDay(date, today);
          const isLast = idx === weekGrid.length - 1;
          return (
            <div
              key={`header-${toDateKey(date)}`}
              className={`sticky top-0 z-30 bg-paper/95 backdrop-blur-xs py-2 text-center min-w-0 border-b border-hairline h-14 ${
                !isLast ? 'border-r' : ''
              }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink block truncate">
                {WEEKDAY_LABELS[(date.getDay() + 6) % 7]}
              </span>
              <span
                className={`inline-flex size-7 items-center justify-center rounded-box text-xs font-bold mt-0.5 ${
                  isToday ? 'bg-[#465D73] text-white' : 'text-ink'
                }`}>
                {date.getDate()}
              </span>
            </div>
          );
        })}

        <HourGutter labelClassName="relative text-right pr-2 text-[11px] font-semibold text-ink -top-2.5" />

        {weekGrid.map(({ date }, idx) => {
          const dateKey = toDateKey(date);
          return (
            <HourlyColumn
              key={dateKey}
              date={date}
              dayIndex={idx}
              isLast={idx === weekGrid.length - 1}
              dayEvents={eventsByDate[dateKey] || []}
              dayVirtual={virtualByDate[dateKey] || []}
              today={today}
              dragPreview={dragPreview}
              onOpenCreate={onOpenCreate}
              onOpenVirtual={onOpenVirtual}
              onEventPointerDown={onEventPointerDown}
              onEventPointerMove={onEventPointerMove}
              onEventPointerUp={onEventPointerUp}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}
