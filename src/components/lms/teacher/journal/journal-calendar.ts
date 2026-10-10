import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { MONTH_LABELS } from './constants';
import { isEventOnDay, toDateKey } from './journal-time';
import type { CalendarCell, JournalEvent, ViewMode } from './types';

export function buildMonthGrid(currentDate: Date): CalendarCell[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    nextDay++;
  }
  return cells;
}

export function buildWeekGrid(currentDate: Date): CalendarCell[] {
  const d = new Date(currentDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 7; i++) {
    cells.push({ date: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), inMonth: true });
  }
  return cells;
}

function targetDatesForView(
  view: ViewMode,
  monthGrid: CalendarCell[],
  weekGrid: CalendarCell[],
  currentDate: Date,
  today: Date,
): Date[] {
  const targetDates: Date[] = [];
  if (view === 'month') {
    monthGrid.forEach((c) => targetDates.push(c.date));
  } else if (view === 'week') {
    weekGrid.forEach((c) => targetDates.push(c.date));
  } else if (view === 'day') {
    targetDates.push(currentDate);
  } else {
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      targetDates.push(d);
    }
  }
  return targetDates;
}

export function buildEventsByDate(
  events: JournalEvent[],
  view: ViewMode,
  monthGrid: CalendarCell[],
  weekGrid: CalendarCell[],
  currentDate: Date,
  today: Date,
): Record<string, JournalEvent[]> {
  const map: Record<string, JournalEvent[]> = {};
  const targetDates = targetDatesForView(view, monthGrid, weekGrid, currentDate, today);

  for (const d of targetDates) {
    const dKey = toDateKey(d);
    const matchingEvents: JournalEvent[] = [];

    for (const ev of events) {
      if (isEventOnDay(ev, d)) {
        matchingEvents.push(ev);
      }
    }

    if (matchingEvents.length > 0) {
      matchingEvents.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.startTime.localeCompare(b.startTime);
      });
      map[dKey] = matchingEvents;
    }
  }

  return map;
}

export function buildVirtualByDate(
  virtualEvents: VirtualScheduleEvent[],
  view: ViewMode,
  monthGrid: CalendarCell[],
  weekGrid: CalendarCell[],
  currentDate: Date,
  today: Date,
  todayKey: string,
): Record<string, VirtualScheduleEvent[]> {
  const map: Record<string, VirtualScheduleEvent[]> = {};
  const targetDates = targetDatesForView(view, monthGrid, weekGrid, currentDate, today);

  for (const d of targetDates) {
    const dKey = toDateKey(d);

    /* წარსულ დღეებში არ ვაჩვენებთ */
    if (dKey < todayKey) continue;

    const jsDay = d.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;

    const matches = virtualEvents.filter((s) => s.dayOfWeek === dow);
    if (matches.length > 0) {
      matches.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map[dKey] = matches;
    }
  }

  return map;
}

export function buildHeaderTitle(view: ViewMode, currentDate: Date, weekGrid: CalendarCell[]) {
  if (view === 'month' || view === 'schedule') {
    return `${MONTH_LABELS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }
  if (view === 'day') {
    return `${currentDate.getDate()} ${MONTH_LABELS[currentDate.getMonth()]}, ${currentDate.getFullYear()}`;
  }
  if (view === 'week') {
    const wStart = weekGrid[0].date;
    const wEnd = weekGrid[6].date;
    if (wStart.getMonth() === wEnd.getMonth()) {
      return `${MONTH_LABELS[wStart.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      return `${MONTH_LABELS[wStart.getMonth()]} - ${MONTH_LABELS[wEnd.getMonth()]} ${currentDate.getFullYear()}`;
    }
  }
}
