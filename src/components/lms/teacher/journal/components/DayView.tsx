'use client';

import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { MONTH_LABELS, WEEKDAY_LABELS } from '../constants';
import { isSameDay, toDateKey } from '../journal-time';
import type {
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

interface DayViewProps {
  currentDate: Date;
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

export function DayView({
  currentDate,
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
}: DayViewProps) {
  const dateKey = toDateKey(currentDate);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar relative">
      <div className="grid grid-cols-[3.5rem_1fr] min-w-full">
        <div className="sticky top-0 z-30 bg-paper/95 backdrop-blur-xs border-b border-r border-hairline h-14" />
        <div className="sticky top-0 z-30 bg-paper/95 backdrop-blur-xs py-2.5 px-4 flex items-center gap-3 border-b border-hairline h-14">
          <span
            className={`flex size-8 items-center justify-center rounded-box text-sm font-bold ${
              isSameDay(currentDate, today) ? 'bg-[#465D73] text-white' : 'bg-sectionHeader text-ink'
            }`}>
            {currentDate.getDate()}
          </span>
          <span className="text-xs font-bold text-ink">
            {WEEKDAY_LABELS[(currentDate.getDay() + 6) % 7]}, {MONTH_LABELS[currentDate.getMonth()]}
          </span>
        </div>

        <HourGutter labelClassName="relative text-right pr-2.5 text-[11px] font-semibold text-ink -top-2.5" />

        <div>
          <HourlyColumn
            date={currentDate}
            dayIndex={0}
            isLast
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
        </div>
      </div>
    </div>
  );
}
