'use client';

import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { WEEKDAY_LABELS } from '../constants';
import { toDateKey } from '../journal-time';
import type { CalendarCell, EventClickHandler, JournalEvent, OpenCreateHandler, OpenVirtualHandler } from '../types';
import { MonthDayCell } from './MonthDayCell';

interface MonthViewProps {
  monthGrid: CalendarCell[];
  eventsByDate: Record<string, JournalEvent[]>;
  virtualByDate: Record<string, VirtualScheduleEvent[]>;
  today: Date;
  onOpenCreate: OpenCreateHandler;
  onEventClick: EventClickHandler;
  onOpenVirtual: OpenVirtualHandler;
}

export function MonthView({
  monthGrid,
  eventsByDate,
  virtualByDate,
  today,
  onOpenCreate,
  onEventClick,
  onOpenVirtual,
}: MonthViewProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="grid grid-cols-7  bg-paper">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-ink">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 h-full min-h-0 grid-cols-7 grid-rows-6 overflow-hidden">
        {monthGrid.map(({ date, inMonth }) => {
          const dateKey = toDateKey(date);
          return (
            <MonthDayCell
              key={dateKey}
              date={date}
              inMonth={inMonth}
              dayEvents={eventsByDate[dateKey] || []}
              dayVirtual={virtualByDate[dateKey] || []}
              today={today}
              onOpenCreate={onOpenCreate}
              onEventClick={onEventClick}
              onOpenVirtual={onOpenVirtual}
            />
          );
        })}
      </div>
    </div>
  );
}
