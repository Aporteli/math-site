import { MONTH_LABELS } from './constants';
import type { JournalEvent } from './types';

export function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateLabel(dateKey: string) {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${d} ${MONTH_LABELS[m - 1]}`;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function timeToMinutes(timeStr: string) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function snapTo(minutes: number, step = 15) {
  return Math.round(minutes / step) * step;
}

export function minutesToTime(mins: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, mins));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function emptyDraft(dateKey: string, startH = 9, endH = 10): JournalEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    date: dateKey,
    allDay: false,
    startTime: `${pad(startH)}:00`,
    endTime: `${pad(endH)}:00`,
    location: '',
    description: '',
    guests: [],
    participants: [],
    color: 'navy',
    repeat: 'none',
    reminder: '30',
  };
}

export function isEventOnDay(ev: JournalEvent, targetDate: Date): boolean {
  const [ey, em, ed] = ev.date.split('-').map(Number);
  const evDate = new Date(ey, em - 1, ed);

  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const evMidnight = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate());
  if (targetMidnight < evMidnight) return false;

  if (ev.repeat === 'none' || !ev.repeat) {
    return isSameDay(evDate, targetDate);
  }

  if (ev.repeat === 'daily') return true;
  if (ev.repeat === 'weekly') return evDate.getDay() === targetDate.getDay();
  if (ev.repeat === 'monthly') return evDate.getDate() === targetDate.getDate();

  return false;
}
