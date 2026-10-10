import type { MouseEvent, PointerEvent } from 'react';
import type { ParticipantRef } from '@/lib/actions/journal-participants';
import type { VirtualScheduleEvent } from '@/lib/actions/journal-schedule';

export type EventColor = 'navy' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
export type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly';
export type ReminderOption = 'none' | '0' | '10' | '30' | '60' | '1440';
export type ViewMode = 'day' | 'week' | 'month' | 'schedule';

export interface JournalEvent {
  id: string;
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  guests: string[];
  participants?: ParticipantRef[];
  color: EventColor;
  repeat: RepeatOption;
  reminder: ReminderOption;
}

export type PopoverState = {
  mode: 'create' | 'edit';
  anchor: { top: number; left: number };
  draft: JournalEvent;
};

export type VirtualPopupState = {
  event: VirtualScheduleEvent;
  dateKey: string;
  anchor: { top: number; left: number };
};

export type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  lastClientX: number;
  lastClientY: number;
  startScrollTop: number;
  scrollContainer: HTMLElement | null;
  originStart: string;
  originDateKey: string;
  durationMin: number;
  moved: boolean;
  minuteDelta: number;
  targetDateKey: string;
  columns: { dateKey: string; left: number; right: number }[];
};

export type DragPreview = {
  id: string;
  dx: number;
  dy: number;
  startTime: string;
  endTime: string;
};

export type CalendarCell = { date: Date; inMonth: boolean };

export type OpenCreateHandler = (el: HTMLElement, date: Date, startH?: number) => void;
export type OpenVirtualHandler = (el: HTMLElement, event: VirtualScheduleEvent, dateKey: string) => void;
export type EventClickHandler = (event: MouseEvent<HTMLDivElement>, item: JournalEvent) => void;
export type EventPointerDownHandler = (
  event: PointerEvent<HTMLDivElement>,
  item: JournalEvent,
  dateKey: string,
) => void;
export type EventPointerHandler = (event: PointerEvent<HTMLDivElement>) => void;
export type UpdateDraftHandler = (patch: Partial<JournalEvent>) => void;
