'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignLeft,
  Bell,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  PanelLeftOpen,
  Plus,
  Repeat,
  Search,
  Trash2,
  User as UserIcon,
  Users,
  X,
  List,
} from 'lucide-react';
import { getJournalEventsAction, saveJournalEventAction, deleteJournalEventAction } from '@/lib/actions/journal';
import {
  getJournalParticipantOptionsAction,
  type ParticipantGroup,
  type ParticipantOption,
  type ParticipantRef,
} from '@/lib/actions/journal-participants';
import {
  getScheduleLessonsAction,
  type VirtualScheduleEvent,
} from '@/lib/actions/journal-schedule';
import { useDashboardFrame } from '@/components/layout/DashboardFrame';

type EventColor = 'navy' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly';
type ReminderOption = 'none' | '0' | '10' | '30' | '60' | '1440';
type ViewMode = 'day' | 'week' | 'month' | 'schedule';

interface JournalEvent {
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

type PopoverState = {
  mode: 'create' | 'edit';
  anchor: { top: number; left: number };
  draft: JournalEvent;
};

type DragState = {
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

type DragPreview = {
  id: string;
  dx: number;
  dy: number;
  startTime: string;
  endTime: string;
};

const WEEKDAY_LABELS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'];
const MONTH_LABELS = [
  'იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი',
  'ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი',
];

const COLOR_OPTIONS: EventColor[] = ['navy', 'sky', 'emerald', 'amber', 'rose', 'violet'];

const COLOR_DOT: Record<EventColor, string> = {
  navy: 'bg-navy',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
};

const COLOR_CHIP: Record<EventColor, string> = {
  navy: 'bg-navy text-white border-navy',
  sky: 'bg-sky-500 text-white border-sky-600',
  emerald: 'bg-emerald-500 text-white border-emerald-600',
  amber: 'bg-amber-500 text-white border-amber-600',
  rose: 'bg-rose-500 text-white border-rose-600',
  violet: 'bg-violet-500 text-white border-violet-600',
};

const REMINDER_LABELS: Record<ReminderOption, string> = {
  none: 'შეხსენების გარეშე',
  '0': 'ღონისძიების დაწყებისას',
  '10': '10 წუთით ადრე',
  '30': '30 წუთით ადრე',
  '60': '1 საათით ადრე',
  '1440': '1 დღით ადრე',
};

const REPEAT_LABELS: Record<RepeatOption, string> = {
  none: 'არ მეორდება',
  daily: 'ყოველდღიურად',
  weekly: 'ყოველკვირეულად',
  monthly: 'ყოველთვიურად',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeToMinutes(timeStr: string) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function snapTo(minutes: number, step = 15) {
  return Math.round(minutes / step) * step;
}

function minutesToTime(mins: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, mins));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

function emptyDraft(dateKey: string, startH = 9, endH = 10): JournalEvent {
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

function isEventOnDay(ev: JournalEvent, targetDate: Date): boolean {
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

const POPOVER_QUICK_WIDTH = 320;
const POPOVER_FULL_WIDTH = 400;
const POPOVER_QUICK_HEIGHT = 280;
const POPOVER_EXPANDED_HEIGHT = 540;

export function TeacherJournalWorkspace() {
  const { toggleSidebarDrawer } = useDashboardFrame();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [virtualEvents, setVirtualEvents] = useState<VirtualScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [guestDraft, setGuestDraft] = useState('');

  /* ── Participant picker state ── */
  const [participantGroups, setParticipantGroups] = useState<ParticipantGroup[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  /* ── Load manual events ── */
  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      const res = await getJournalEventsAction();
      if (res.success && res.events) {
        setEvents(
          (res.events as JournalEvent[]).map((e) => ({
            ...e,
            participants: (e.participants as ParticipantRef[] | undefined) ?? [],
          }))
        );
      }
      setLoading(false);
    }
    loadEvents();
  }, []);

  /* ── Load virtual schedule lessons ── */
  useEffect(() => {
    async function loadSchedule() {
      const res = await getScheduleLessonsAction();
      if (res.success) setVirtualEvents(res.events);
    }
    loadSchedule();
  }, []);

  /* ── Load participant options ── */
  useEffect(() => {
    async function loadParticipantOptions() {
      setParticipantsLoading(true);
      const res = await getJournalParticipantOptionsAction();
      if (res.success) setParticipantGroups(res.groups);
      setParticipantsLoading(false);
    }
    loadParticipantOptions();
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

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
  }, [currentDate]);

  const weekGrid = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      cells.push({ date: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), inMonth: true });
    }
    return cells;
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, JournalEvent[]> = {};
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
  }, [events, view, monthGrid, weekGrid, currentDate, today]);

  /* ─── Virtual lessons (Schedule → Journal) ─── */
  const virtualByDate = useMemo(() => {
    const map: Record<string, VirtualScheduleEvent[]> = {};

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
  }, [virtualEvents, view, monthGrid, weekGrid, currentDate, today, todayKey]);

  useEffect(() => {
    if (!popover) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopover();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [popover]);

  function closePopover() {
    setPopover(null);
    setExpanded(false);
    setGuestDraft('');
    setParticipantsOpen(false);
    setParticipantSearch('');
  }

  function clampPosition(rawTop: number, rawLeft: number, width: number, isExp = false) {
    const padding = 16;
    const height = isExp ? POPOVER_EXPANDED_HEIGHT : POPOVER_QUICK_HEIGHT;
    const maxLeft = window.innerWidth - width - padding;
    const maxTop = window.innerHeight - height - padding;
    return {
      left: Math.min(Math.max(padding, rawLeft), Math.max(padding, maxLeft)),
      top: Math.min(Math.max(padding, rawTop), Math.max(padding, maxTop)),
    };
  }

  function openCreateFromElement(el: HTMLElement, date: Date, startH = 9) {
    const rect = el.getBoundingClientRect();
    const pos = clampPosition(rect.top, rect.left, POPOVER_QUICK_WIDTH, false);
    setExpanded(false);
    setPopover({
      mode: 'create',
      anchor: pos,
      draft: emptyDraft(toDateKey(date), startH, (startH + 1) % 24),
    });
  }

  function handleEventClick(e: React.MouseEvent<HTMLDivElement>, ev: JournalEvent) {
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = clampPosition(rect.top, rect.left, POPOVER_FULL_WIDTH, true);
    setExpanded(true);
    setPopover({
      mode: 'edit',
      anchor: pos,
      draft: { ...ev, participants: ev.participants ?? [] },
    });
  }

  function handleAddClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = clampPosition(rect.bottom + 8, rect.right - POPOVER_QUICK_WIDTH, POPOVER_QUICK_WIDTH, false);
    setExpanded(false);
    setPopover({ mode: 'create', anchor: pos, draft: emptyDraft(toDateKey(today)) });
  }

  function toggleExpandMore() {
    setExpanded(true);
    setPopover((prev) => {
      if (!prev) return null;
      const reClamped = clampPosition(prev.anchor.top, prev.anchor.left, POPOVER_FULL_WIDTH, true);
      return { ...prev, anchor: reClamped };
    });
  }

  function updateDraft(patch: Partial<JournalEvent>) {
    setPopover((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));
  }

  async function handleSave() {
    if (!popover) return;
    const draft = popover.draft;
    if (!draft.title.trim()) return;

    setIsSaving(true);
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === draft.id);
      if (exists) return prev.map((e) => (e.id === draft.id ? draft : e));
      return [...prev, draft];
    });
    closePopover();

    const res = await saveJournalEventAction({
      ...draft,
      participants: draft.participants ?? [],
    });
    if (!res.success) console.error('შეცდომა შენახვისას');
    setIsSaving(false);
  }

  async function handleDelete() {
    if (!popover) return;
    const idToDelete = popover.draft.id;
    setEvents((prev) => prev.filter((e) => e.id !== idToDelete));
    closePopover();
    await deleteJournalEventAction(idToDelete);
  }

  function addGuest() {
    const value = guestDraft.trim();
    if (!value || !popover) return;
    updateDraft({ guests: [...popover.draft.guests, value] });
    setGuestDraft('');
  }

  function removeGuest(name: string) {
    if (!popover) return;
    updateDraft({ guests: popover.draft.guests.filter((g) => g !== name) });
  }

  function isParticipantSelected(id: string) {
    return popover?.draft.participants?.some((p) => p.id === id) ?? false;
  }

  function toggleParticipant(option: ParticipantOption) {
    if (!popover) return;
    const current = popover.draft.participants ?? [];
    const exists = current.some((p) => p.id === option.id);
    const next: ParticipantRef[] = exists
      ? current.filter((p) => p.id !== option.id)
      : [
          ...current,
          {
            id: option.id,
            name: option.name,
            type: option.type,
            userId: option.userId,
            individualStudentId: option.individualStudentId,
            courseId: option.courseId,
            courseTitle: option.courseTitle,
          },
        ];
    updateDraft({ participants: next });
  }

  function removeParticipant(id: string) {
    if (!popover) return;
    updateDraft({
      participants: (popover.draft.participants ?? []).filter((p) => p.id !== id),
    });
  }

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

  /* ----------------------------- Drag & Drop ----------------------------- */

  function startDragLoop() {
    if (rafRef.current !== null) return;

    const tick = () => {
      const d = dragRef.current;
      if (!d) {
        rafRef.current = null;
        return;
      }

      const sc = d.scrollContainer;
      if (sc && d.moved) {
        const r = sc.getBoundingClientRect();
        const EDGE = 40;
        const SPEED = 12;
        if (d.lastClientY < r.top + EDGE) {
          sc.scrollTop -= SPEED;
        } else if (d.lastClientY > r.bottom - EDGE) {
          sc.scrollTop += SPEED;
        }
      }

      if (d.moved) {
        const scrollTop = d.scrollContainer?.scrollTop ?? 0;
        const scrollDelta = scrollTop - d.startScrollTop;

        const dxViewport = d.lastClientX - d.startX;
        const dyContent = d.lastClientY - d.startY + scrollDelta;

        const minuteDelta = snapTo((dyContent / HOUR_HEIGHT) * 60, 15);
        const dyPx = (minuteDelta / 60) * HOUR_HEIGHT;

        const hit = d.columns.find((c) => d.lastClientX >= c.left && d.lastClientX < c.right);
        if (hit) d.targetDateKey = hit.dateKey;
        d.minuteDelta = minuteDelta;

        const rawStart = timeToMinutes(d.originStart) + minuteDelta;
        const startMin = Math.max(0, Math.min(24 * 60 - d.durationMin, rawStart));
        const startTime = minutesToTime(startMin);
        const endTime = minutesToTime(startMin + d.durationMin);

        setDragPreview((prev) => {
          if (
            prev &&
            prev.id === d.id &&
            prev.dx === dxViewport &&
            prev.dy === dyPx &&
            prev.startTime === startTime &&
            prev.endTime === endTime
          ) {
            return prev;
          }
          return { id: d.id, dx: dxViewport, dy: dyPx, startTime, endTime };
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  function handleEventPointerDown(e: React.PointerEvent<HTMLDivElement>, ev: JournalEvent, dateKey: string) {
    if (e.button !== 0 || ev.allDay || ev.repeat !== 'none') return;

    e.stopPropagation();
    didDragRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);

    const scrollContainer = e.currentTarget.closest('.overflow-y-auto') as HTMLElement | null;

    const columns = Array.from(document.querySelectorAll<HTMLElement>('[data-day-column]')).map((c) => {
      const r = c.getBoundingClientRect();
      return { dateKey: c.dataset.dateKey!, left: r.left, right: r.right };
    });

    dragRef.current = {
      id: ev.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      startScrollTop: scrollContainer?.scrollTop ?? 0,
      scrollContainer,
      originStart: ev.startTime,
      originDateKey: dateKey,
      durationMin: Math.max(30, timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime)),
      moved: false,
      minuteDelta: 0,
      targetDateKey: dateKey,
      columns,
    };

    startDragLoop();
  }

  function handleEventPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    d.lastClientX = e.clientX;
    d.lastClientY = e.clientY;

    if (!d.moved) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      d.moved = true;
      didDragRef.current = true;
    }
  }

  function handleEventPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    dragRef.current = null;
    setDragPreview(null);

    if (!d.moved) return;

    const rawStart = timeToMinutes(d.originStart) + d.minuteDelta;
    const startMin = Math.max(0, Math.min(24 * 60 - d.durationMin, rawStart));

    void moveEvent(d.id, d.targetDateKey, minutesToTime(startMin), minutesToTime(startMin + d.durationMin));
  }

  async function moveEvent(id: string, date: string, startTime: string, endTime: string) {
    const current = events.find((e) => e.id === id);
    if (!current) return;
    if (current.date === date && current.startTime === startTime && current.endTime === endTime) return;

    const next: JournalEvent = { ...current, date, startTime, endTime, allDay: false };

    setEvents((prev) => prev.map((e) => (e.id === id ? next : e)));
    const res = await saveJournalEventAction({
      ...next,
      participants: next.participants ?? [],
    });
    if (!res.success) {
      setEvents((prev) => prev.map((e) => (e.id === id ? current : e)));
    }
  }

  /* ----------------------------------------------------------------------- */

  const draft = popover?.draft;

  const headerTitle = useMemo(() => {
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
  }, [currentDate, view, weekGrid]);

  /* ─── Google Calendar სტილი: ღია ფონი + მარცხენა ფერადი ზოლი ─── */
  const virtualChipClass = (source: 'group' | 'individual') =>
    source === 'group'
      ? 'bg-sky-500 text-sky-950 border-l-[3px] border-sky-500'
      : 'bg-emerald-500 text-emerald-950 border-l-[3px] border-emerald-500';

  const renderMonthDayCell = (date: Date, inMonth: boolean) => {
    const dateKey = toDateKey(date);
    const dayEvents = eventsByDate[dateKey] || [];
    const dayVirtual = virtualByDate[dateKey] || [];
    const isToday = isSameDay(date, today);

    return (
      <div
        key={dateKey}
        role="button"
        tabIndex={0}
        onClick={(e) => openCreateFromElement(e.currentTarget, date)}
        className={`group relative flex h-full flex-col gap-1 border-b border-r border-hairline p-1.5 text-left transition-colors cursor-pointer hover:bg-paper/50 focus:outline-none overflow-hidden ${
          !inMonth ? 'bg-paper/20' : ''
        }`}>
        <div className="flex items-center justify-between shrink-0">
          <span
            className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
              isToday ? 'bg-navy text-white' : inMonth ? 'text-ink' : 'text-muted/40'
            }`}>
            {date.getDate()}
          </span>
          <span className="hidden size-4 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy group-hover:flex">
            <Plus className="size-2.5" />
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 min-w-0 overflow-y-auto no-scrollbar">
          {/* ─── Manual events ─── */}
          {dayEvents.map((ev) => (
            <div
              key={`${ev.id}-${dateKey}`}
              onClick={(e) => handleEventClick(e, ev)}
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
              title={`${v.studentName} · ${v.startTime}–${v.endTime}${v.courseTitle ? ` · ${v.courseTitle}` : ''}`}
              className={`relative truncate rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-tight shrink-0 flex items-center gap-1.5 pointer-events-none ${virtualChipClass(v.source)}`}>
              <span className="opacity-70 font-normal tabular-nums shrink-0">
                {v.startTime}
              </span>
              <span className="truncate">{v.studentName}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHourlyColumn = (date: Date, dayIndex: number, isLast = false) => {
    const dateKey = toDateKey(date);
    const dayEvents = eventsByDate[dateKey] || [];
    const dayVirtual = virtualByDate[dateKey] || [];
    const isToday = isSameDay(date, today);
    const currentMinutes = today.getHours() * 60 + today.getMinutes();

    return (
      <div
        key={dateKey}
        data-day-column
        data-day-index={dayIndex}
        data-date-key={dateKey}
        className={`relative w-full h-full select-none ${!isLast ? 'border-r border-hairline' : ''}`}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{ height: `${HOUR_HEIGHT}px` }}
            onClick={(e) => openCreateFromElement(e.currentTarget, date, hour)}
            className="border-b border-hairline/60 hover:bg-navy/5 cursor-pointer transition-colors relative group">
            <div className="hidden group-hover:flex absolute inset-x-1 top-1 h-5 rounded bg-navy/10 items-center justify-center text-[10px] font-bold text-navy">
              + {pad(hour)}:00
            </div>
          </div>
        ))}

        {isToday && (
          <div
            style={{ top: `${(currentMinutes / 60) * HOUR_HEIGHT}px` }}
            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center">
            <div className="size-2 rounded-full bg-rose-500 -ml-1" />
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
              title={`${v.studentName} · ${v.startTime}–${v.endTime}${v.courseTitle ? ` · ${v.courseTitle}` : ''}`}
              className={`absolute inset-x-1 z-[5] overflow-hidden rounded-md p-1.5 text-xs leading-tight pointer-events-none ${virtualChipClass(v.source)}`}>
              <div className="flex items-center gap-1 font-semibold">
                <span className="truncate text-[12px]">{v.studentName}</span>
              </div>
              <div className="text-[10px] opacity-70 font-normal tabular-nums mt-0.5">
                {v.startTime} – {v.endTime}
              </div>
              {v.courseTitle && (
                <div className="text-[10px] opacity-60 font-normal truncate mt-0.5">
                  {v.courseTitle}
                </div>
              )}
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
              onPointerDown={(e) => handleEventPointerDown(e, ev, dateKey)}
              onPointerMove={handleEventPointerMove}
              onPointerUp={handleEventPointerUp}
              onPointerCancel={handleEventPointerUp}
              onClick={(e) => handleEventClick(e, ev)}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                touchAction: 'none',
                transform: isDragging ? `translate(${dragPreview!.dx}px, ${dragPreview!.dy}px)` : undefined,
              }}
              className={`absolute inset-x-1 z-10 overflow-hidden rounded-xl border p-1.5 text-xs font-bold leading-tight shadow-md cursor-grab active:cursor-grabbing transition-all ${
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
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface from-paper/60 to-white px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSidebarDrawer}
            title="მენიუს გახსნა"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white text-ink shadow-sm transition-all hover:border-navy/30 hover:text-navy active:scale-95">
            <PanelLeftOpen className="size-4" />
          </button>

          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-navy/10 bg-navy-tint text-navy">
            {loading ? (
              <Loader2 className="size-4 animate-spin text-brass-strong" />
            ) : (
              <CalendarIcon className="size-4 text-brass-strong" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-ink leading-tight">ჟურნალი</h3>
            <p className="text-xs text-muted capitalize">{headerTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm hover:border-navy/30 hover:shadow-md transition-all active:scale-95">
            დღეს
          </button>

          <div className="flex items-center overflow-hidden rounded-xl border border-hairline bg-white shadow-sm transition-all hover:border-navy/30 hover:shadow-md">
            <button
              type="button"
              onClick={goToPrev}
              className="flex size-8 items-center justify-center text-muted hover:bg-paper hover:text-ink transition-colors">
              <ChevronLeft className="size-4 text-brass-strong" />
            </button>
            <div className="h-4 w-px bg-hairline" />
            <button
              type="button"
              onClick={goToNext}
              className="flex size-8 items-center justify-center text-muted hover:bg-paper hover:text-ink transition-colors">
              <ChevronRight className="size-4 text-brass-strong " />
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setViewMenuOpen(!viewMenuOpen)}
              className="flex min-w-[100px] items-center justify-between gap-2 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm transition-all hover:border-navy/30 hover:shadow-md focus:outline-none active:scale-95">
              <span>
                {view === 'day' && 'დღე'}
                {view === 'week' && 'კვირა'}
                {view === 'month' && 'თვე'}
                {view === 'schedule' && 'განრიგი'}
              </span>
              <ChevronDown
                className={`size-3.5 text-navy-strong transition-transform duration-200 ${
                  viewMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {viewMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setViewMenuOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-1.5 w-36 overflow-hidden rounded-xl border border-hairline bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                  {(['day', 'week', 'month', 'schedule'] as ViewMode[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setView(v);
                        setViewMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        view === v ? 'bg-navy/10 text-navy' : 'text-ink hover:bg-paper'
                      }`}>
                      {v === 'day' && 'დღე'}
                      {v === 'week' && 'კვირა'}
                      {v === 'month' && 'თვე'}
                      {v === 'schedule' && 'განრიგი'}
                      {view === v && <Check className="size-3 text-brass-strong" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-navy-strong transition-colors active:scale-95 ml-1">
            <Plus className="size-3.5" />
            ღონისძიება
          </button>
        </div>
      </div>

      {/* Legend — Google Calendar style */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-hairline bg-white px-4 py-2 text-[11px] font-medium text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-navy" />
          <span className="text-ink">ჟურნალის ღონისძიება</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-sky-500" />
          <span className="text-ink">ჯგუფური გაკვეთილი</span>
        </span>
        <span className="flex items-center gap-1.5 ">
          <span className="inline-block size-3 rounded-sm bg-emerald-500" />
          <span className="text-ink">ინდივიდუალური გაკვეთილი</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-navy">
          <Repeat className="size-3" />
          <span>ავტომატური სინქრონიზაცია</span>
        </span>
      </div>

      {/* 1. თვის ხედი */}
      {view === 'month' && (
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
            {monthGrid.map(({ date, inMonth }) => renderMonthDayCell(date, inMonth))}
          </div>
        </div>
      )}

      {/* 2. კვირის ხედი */}
      {view === 'week' && (
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
                    className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                      isToday ? 'bg-navy text-white' : 'text-ink'
                    }`}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}

            <div className="border-r border-hairline select-none bg-paper/10">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="relative text-right pr-2 text-[11px] font-semibold text-ink -top-2.5">
                  {hour !== 0 ? `${pad(hour)}:00` : ''}
                </div>
              ))}
            </div>

            {weekGrid.map(({ date }, idx) => renderHourlyColumn(date, idx, idx === weekGrid.length - 1))}
          </div>
        </div>
      )}

      {/* 3. დღის ხედი */}
      {view === 'day' && (
        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar relative">
          <div className="grid grid-cols-[3.5rem_1fr] min-w-full">
            <div className="sticky top-0 z-30 bg-paper/95 backdrop-blur-xs border-b border-r border-hairline h-14" />
            <div className="sticky top-0 z-30 bg-paper/95 backdrop-blur-xs py-2.5 px-4 flex items-center gap-3 border-b border-hairline h-14">
              <span
                className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                  isSameDay(currentDate, today) ? 'bg-navy text-white' : 'bg-paper text-ink'
                }`}>
                {currentDate.getDate()}
              </span>
              <span className="text-xs font-bold text-ink">
                {WEEKDAY_LABELS[(currentDate.getDay() + 6) % 7]}, {MONTH_LABELS[currentDate.getMonth()]}
              </span>
            </div>

            <div className="border-r border-hairline select-none bg-paper/10">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="relative text-right pr-2.5 text-[11px] font-semibold text-ink -top-2.5">
                  {hour !== 0 ? `${pad(hour)}:00` : ''}
                </div>
              ))}
            </div>

            <div>{renderHourlyColumn(currentDate, 0, true)}</div>
          </div>
        </div>
      )}

      {/* 4. განრიგის ხედი */}
      {view === 'schedule' && (
        <div className="flex-1 h-full min-h-0 overflow-y-auto p-6 bg-slate-50/50 thin-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
            {Object.keys(eventsByDate)
              .sort()
              .map((dateKey) => {
                const dateObj = new Date(dateKey);
                return (
                  <div key={dateKey} className="flex gap-6 relative">
                    <div className="w-16 shrink-0 text-center flex flex-col items-center">
                      <span className="text-xs font-bold text-muted uppercase">
                        {WEEKDAY_LABELS[(dateObj.getDay() + 6) % 7]}
                      </span>
                      <span
                        className={`text-2xl mt-1 font-black ${isSameDay(dateObj, today) ? 'text-navy' : 'text-ink'}`}>
                        {dateObj.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2 pt-1">
                      {eventsByDate[dateKey].map((ev) => (
                        <div
                          key={`${ev.id}-${dateKey}`}
                          onClick={(e) => handleEventClick(e as any, ev)}
                          className="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-hairline shadow-sm hover:border-navy/30 hover:shadow-md cursor-pointer transition-all">
                          <div className={`size-2.5 rounded-full ${COLOR_DOT[ev.color]}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-ink">{ev.title || '(უსათაურო)'}</h4>
                              {ev.repeat !== 'none' && <Repeat className=" text-brass-strong size-3 " />}
                              {(ev.participants?.length ?? 0) > 0 && (
                                <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-navy font-bold">
                                  <Users className="size-3" />
                                  {ev.participants!.length}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-3 mt-1 text-[11px] text-muted font-medium">
                              {ev.allDay ? (
                                <span>მთელი დღე</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3 text-brass-strong " /> {ev.startTime} - {ev.endTime}
                                </span>
                              )}
                              {ev.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" /> {ev.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* ─── Virtual schedule lessons (Google Calendar style) ─── */}
                      {(virtualByDate[dateKey] ?? []).map((v) => (
                        <div
                          key={v.id}
                          className={`flex items-center gap-4 p-3 rounded-md pointer-events-none ${virtualChipClass(v.source)}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-semibold">{v.studentName}</h4>
                              {v.courseTitle && (
                                <span className="text-[10px] opacity-70">· {v.courseTitle}</span>
                              )}
                            </div>
                            <div className="flex gap-3 mt-1 text-[11px] opacity-75 font-medium">
                              <span className="flex items-center gap-1 tabular-nums">
                                <Clock className="size-3" /> {v.startTime} - {v.endTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            {Object.keys(eventsByDate).length === 0 && Object.keys(virtualByDate).length === 0 && (
              <div className="text-center py-20 text-muted font-medium flex flex-col items-center gap-3">
                <List className="size-8 opacity-20" />
                მომავალი ღონისძიებები არ მოიძებნა
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popover — unchanged */}
      {popover && draft && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePopover} />
          <div
            style={{ top: popover.anchor.top, left: popover.anchor.left }}
            className={`fixed z-50 rounded-2xl border border-hairline bg-white shadow-2xl ring-1 ring-black/5 transition-[top,width] duration-150 animate-in fade-in zoom-in-95 w-80
            }`}
            onClick={(e) => e.stopPropagation()}>
            <div className={`h-1.5 w-full rounded-t-2xl ${COLOR_DOT[draft.color]}`} />

            <div className="max-h-[85vh] overflow-y-auto p-4 space-y-4 thin-scrollbar">
              <div className="flex items-start gap-2">
                <input
                  autoFocus
                  value={draft.title}
                  onChange={(e) => updateDraft({ title: e.target.value })}
                  placeholder="ღონისძიების სათაური"
                  className="flex-1 border-b-2 border-hairline bg-transparent pb-1.5 text-base font-bold text-ink outline-none transition-colors focus:border-navy placeholder:font-medium placeholder:text-muted/60"
                />
                <button
                  type="button"
                  onClick={closePopover}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink transition-colors">
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="mt-2 size-4 shrink-0 text-brass-strong" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) => updateDraft({ date: e.target.value })}
                      className="flex-1 rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-bold text-ink outline-none focus:border-navy"
                    />
                    <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
                      <input
                        type="checkbox"
                        checked={draft.allDay}
                        onChange={(e) => updateDraft({ allDay: e.target.checked })}
                        className="size-3.5 rounded border-hairline accent-navy"
                      />
                      მთელი დღე
                    </label>
                  </div>
                  {!draft.allDay && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(e) => updateDraft({ startTime: e.target.value })}
                        className="flex-1 rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-bold text-ink outline-none focus:border-navy"
                      />
                      <span className="text-xs text-muted">—</span>
                      <input
                        type="time"
                        value={draft.endTime}
                        onChange={(e) => updateDraft({ endTime: e.target.value })}
                        className="flex-1 rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-bold text-ink outline-none focus:border-navy"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Repeat className=" size-3.5 shrink-0 text-brass-strong" />
                    <select
                      value={draft.repeat}
                      onChange={(e) => updateDraft({ repeat: e.target.value as RepeatOption })}
                      className="flex-1 rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-bold text-ink outline-none focus:border-navy">
                      {(Object.keys(REPEAT_LABELS) as RepeatOption[]).map((key) => (
                        <option key={key} value={key}>
                          {REPEAT_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-7">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateDraft({ color: c })}
                    className={`size-5 rounded-full ${COLOR_DOT[c]} transition-transform hover:scale-110 ${
                      draft.color === c ? 'ring-2 ring-offset-2 ring-navy' : ''
                    }`}
                  />
                ))}
              </div>

              {expanded && (
                <>
                  <div className="flex items-start gap-3">
                    <GraduationCap className="mt-2 size-4 shrink-0 text-brass-strong" />
                    <div className="flex-1 space-y-2">
                      {(draft.participants ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(draft.participants ?? []).map((p) => (
                            <span
                              key={p.id}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                                p.type === 'group'
                                  ? 'bg-navy/10 border-navy/20 text-navy'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              }`}>
                              {p.type === 'group' ? (
                                <Users className="size-3" />
                              ) : (
                                <UserIcon className="size-3" />
                              )}
                              <span className="truncate max-w-[140px]">{p.name}</span>
                              {p.courseTitle && (
                                <span className="opacity-60 font-normal truncate max-w-[100px]">
                                  · {p.courseTitle}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeParticipant(p.id)}
                                className="hover:text-rose-600">
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setParticipantsOpen((v) => !v)}
                        className="w-full flex items-center justify-between rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-medium text-ink hover:border-navy/30 transition-colors">
                        <span className="flex items-center gap-1.5 text-muted">
                          <Search className="size-3" />
                          მოსწავლის დამატება...
                        </span>
                        <ChevronDown
                          className={`size-3.5 transition-transform ${participantsOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {participantsOpen && (
                        <div className="rounded-lg border border-hairline bg-white shadow-sm overflow-hidden">
                          <div className="p-1.5 border-b border-hairline/60">
                            <input
                              value={participantSearch}
                              onChange={(e) => setParticipantSearch(e.target.value)}
                              placeholder="ძებნა..."
                              className="w-full rounded-md border border-hairline bg-paper/40 px-2 py-1 text-[11px] font-medium text-ink outline-none focus:border-navy"
                            />
                          </div>

                          <div className="max-h-56 overflow-y-auto thin-scrollbar">
                            {participantsLoading ? (
                              <div className="p-3 text-center text-xs text-muted">
                                <Loader2 className="size-3.5 animate-spin inline" />
                              </div>
                            ) : participantGroups.length === 0 ? (
                              <div className="p-3 text-center text-xs text-muted">
                                მოსწავლეები ვერ მოიძებნა
                              </div>
                            ) : (
                              participantGroups.map((g) => {
                                const filtered = g.students.filter((s) =>
                                  s.name.toLowerCase().includes(participantSearch.toLowerCase())
                                );
                                if (filtered.length === 0) return null;
                                return (
                                  <div
                                    key={g.label}
                                    className="border-b border-hairline/60 last:border-b-0">
                                    <div
                                      className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                                        g.type === 'group'
                                          ? 'bg-navy/5 text-navy'
                                          : 'bg-emerald-50 text-emerald-700'
                                      }`}>
                                      {g.type === 'group' ? (
                                        <Users className="size-3 inline mr-1" />
                                      ) : (
                                        <UserIcon className="size-3 inline mr-1" />
                                      )}
                                      {g.label}
                                    </div>
                                    {filtered.map((s) => {
                                      const selected = isParticipantSelected(s.id);
                                      return (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => toggleParticipant(s)}
                                          className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                                            selected
                                              ? 'bg-navy/5 text-navy font-bold'
                                              : 'text-ink hover:bg-paper'
                                          }`}>
                                          <span className="truncate">{s.name}</span>
                                          {selected && (
                                            <Check className="size-3.5 text-brass-strong shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="size-4 shrink-0 text-brass-strong" />
                    <input
                      value={draft.location}
                      onChange={(e) => updateDraft({ location: e.target.value })}
                      placeholder="მდებარეობა"
                      className="flex-1 rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:border-navy placeholder:text-muted/60"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="mt-2 size-4 shrink-0 text-brass-strong" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={guestDraft}
                          onChange={(e) => setGuestDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addGuest();
                            }
                          }}
                          placeholder="დაამატეთ სტუმარი (თავისუფალი ტექსტი)..."
                          className="flex-1 rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:border-navy placeholder:text-muted/60"
                        />
                        <button
                          type="button"
                          onClick={addGuest}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:bg-paper hover:text-ink transition-colors">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      {draft.guests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {draft.guests.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center gap-1 rounded-full border border-hairline bg-paper px-2.5 py-1 text-[11px] font-bold text-ink">
                              {g}
                              <button
                                type="button"
                                onClick={() => removeGuest(g)}
                                className="text-muted hover:text-rose-600">
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlignLeft className="mt-2 size-4 shrink-0 text-brass-strong" />
                    <textarea
                      value={draft.description}
                      onChange={(e) => updateDraft({ description: e.target.value })}
                      placeholder="აღწერა"
                      rows={3}
                      className="flex-1 resize-none rounded-lg border border-hairline bg-paper/50 px-2.5 py-2 text-xs font-medium text-ink outline-none focus:border-navy placeholder:text-muted/60"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Bell className="size-4 shrink-0 text-brass-strong" />
                    <select
                      value={draft.reminder}
                      onChange={(e) => updateDraft({ reminder: e.target.value as ReminderOption })}
                      className="flex-1 rounded-lg border border-hairline bg-paper/50 px-2.5 py-1.5 text-xs font-bold text-ink outline-none focus:border-navy">
                      {(Object.keys(REMINDER_LABELS) as ReminderOption[]).map((key) => (
                        <option key={key} value={key}>
                          {REMINDER_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-1">
                {popover.mode === 'edit' ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 className="size-3.5" />
                    წაშლა
                  </button>
                ) : !expanded ? (
                  <button
                    type="button"
                    onClick={toggleExpandMore}
                    className="text-xs font-bold text-navy hover:underline">
                    მეტი პარამეტრი
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  disabled={!draft.title.trim() || isSaving}
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-strong disabled:opacity-40 transition-all active:scale-95">
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 " />}
                  შენახვა
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}