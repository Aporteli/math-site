'use client';

import { useMemo, useState } from 'react';
import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';
import { buildEventsByDate, buildHeaderTitle, buildMonthGrid, buildVirtualByDate, buildWeekGrid } from '../journal-calendar';
import { toDateKey } from '../journal-time';
import type { JournalEvent, ViewMode } from '../types';

export function useJournalCalendar(events: JournalEvent[], virtualEvents: VirtualScheduleEvent[]) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const monthGrid = useMemo(() => buildMonthGrid(currentDate), [currentDate]);
  const weekGrid = useMemo(() => buildWeekGrid(currentDate), [currentDate]);

  const eventsByDate = useMemo(
    () => buildEventsByDate(events, view, monthGrid, weekGrid, currentDate, today),
    [events, view, monthGrid, weekGrid, currentDate, today],
  );

  const virtualByDate = useMemo(
    () => buildVirtualByDate(virtualEvents, view, monthGrid, weekGrid, currentDate, today, todayKey),
    [virtualEvents, view, monthGrid, weekGrid, currentDate, today, todayKey],
  );

  function goToPrev() {
    setCurrentDate((d) => {
      if (view === 'month') return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      if (view === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    });
  }

  function goToNext() {
    setCurrentDate((d) => {
      if (view === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      if (view === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  const headerTitle = useMemo(() => buildHeaderTitle(view, currentDate, weekGrid), [currentDate, view, weekGrid]);

  return {
    currentDate,
    view,
    setView,
    viewMenuOpen,
    setViewMenuOpen,
    today,
    monthGrid,
    weekGrid,
    eventsByDate,
    virtualByDate,
    goToPrev,
    goToNext,
    goToToday,
    headerTitle,
  };
}
