'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, Wallet, TrendingUp,
  AlertCircle, Clock3, Users, UserX, UserCheck,
} from 'lucide-react';
import { EditableAmount } from './EditableAmount';
import {
  WEEKDAYS_KA, formatMonthLabel, parseMonthKey,
  sumPaymentsForMonth, computeExpectedForMonth,
  getMonthKey, toDateKey, parseDateKey, isSameDay,
  weekDates, monthCells, shiftByView, formatPeriodLabel, formatDayLabel,
  lessonsForDate, getDayDot, padDateKey, isLessonMissed, groupDayLessons,
} from '../paymentCalendar.helpers';
import type { CalendarView, CalendarSession, DayDot, DayLesson } from '../paymentCalendar.helpers';
import { formatPrice, getGroupName } from '../studentList.helpers';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../studentList.types';

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: 'day', label: 'დღე' },
  { id: 'week', label: 'კვირა' },
  { id: 'month', label: 'თვე' },
];

const VIEW_SUBTITLE: Record<CalendarView, string> = {
  day: 'დღის მიხედვით კონტროლი',
  week: 'კვირის მიხედვით კონტროლი',
  month: 'თვის მიხედვით კონტროლი',
};

const DOT_CLASS: Record<Exclude<DayDot, 'none'>, string> = {
  paid: 'bg-win',
  partial: 'bg-brass',
  unpaid: 'bg-loss',
  missed: 'bg-loss',
};

interface Props {
  students: StudentRecord[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  onMonthChange: (key: string) => void;
  onSetPaid: (studentId: string, monthKey: string, amount: number) => void;
  onSelectStudent?: (student: StudentRecord) => void;
  onToggleMissed?: (
    studentId: string,
    lessonId: string,
    date: string,
    missed: boolean,
  ) => void;
}

function initialFocusKey(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const today = new Date();
  if (today.getFullYear() === year && today.getMonth() + 1 === month) {
    return toDateKey(today);
  }
  return padDateKey(year, month, 1);
}

export function PaymentCalendar({
  students, groups, payments, monthKey, onMonthChange, onSetPaid,
  onSelectStudent, onToggleMissed,
}: Props) {
  const [view, setView] = useState<CalendarView>('month');
  const [focusKey, setFocusKey] = useState(() => initialFocusKey(monthKey));

  const focusDate = useMemo(() => parseDateKey(focusKey), [focusKey]);
  const today = new Date();
  const { year, month } = parseMonthKey(monthKey);

  useEffect(() => {
    if (getMonthKey(parseDateKey(focusKey)) === monthKey) return;
    const { year: y, month: m } = parseMonthKey(monthKey);
    const dim = new Date(y, m, 0).getDate();
    const day = Math.min(parseDateKey(focusKey).getDate(), dim);
    setFocusKey(padDateKey(y, m, day));
  }, [monthKey, focusKey]);

  const goToDate = (date: Date) => {
    const nextKey = toDateKey(date);
    setFocusKey(nextKey);
    const nextMonth = getMonthKey(date);
    if (nextMonth !== monthKey) onMonthChange(nextMonth);
  };

  const shiftPeriod = (delta: number) => {
    goToDate(shiftByView(focusDate, view, delta));
  };

  const monthGrid = useMemo(() => monthCells(year, month), [year, month]);
  const weekGrid = useMemo(() => weekDates(focusDate), [focusDate]);

  const visibleDates = useMemo(() => {
    if (view === 'day') return [focusDate];
    if (view === 'week') return weekGrid;
    return monthGrid.map((c) => c.date);
  }, [view, focusDate, weekGrid, monthGrid]);

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, DayLesson[]>();
    visibleDates.forEach((date) => {
      map.set(toDateKey(date), lessonsForDate(students, date));
    });
    return map;
  }, [students, visibleDates]);

  const monthStats = useMemo(() => {
    let expected = 0, paid = 0;
    students.forEach((s) => {
      expected += computeExpectedForMonth(s, year, month);
      paid += sumPaymentsForMonth(payments, s.id, monthKey);
    });
    return { expected, paid, debt: Math.max(0, expected - paid) };
  }, [students, payments, monthKey, year, month]);

  const selectedLessons = lessonsByDate.get(focusKey) ?? lessonsForDate(students, focusDate);
  const navLabel =
    view === 'day' ? { prev: 'წინა დღე', next: 'შემდეგი დღე' }
    : view === 'week' ? { prev: 'წინა კვირა', next: 'შემდეგი კვირა' }
    : { prev: 'წინა თვე', next: 'შემდეგი თვე' };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-brass-tint text-brass-strong">
              <CalendarDays className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink sm:text-lg">გადახდების კალენდარი</h2>
              <p className="text-xs font-medium text-muted">{VIEW_SUBTITLE[view]}</p>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={() => goToDate(new Date())}
              className={`h-10 shrink-0 cursor-pointer rounded-full border px-3 text-xs font-bold transition sm:h-8 ${
                isSameDay(focusDate, today)
                  ? 'border-navy bg-navy text-white'
                  : 'border-hairline bg-paper text-ink hover:border-navy/40'
              }`}
            >
              დღეს
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-hairline bg-paper p-1 sm:flex-none">
              <button
                type="button"
                onClick={() => shiftPeriod(-1)}
                aria-label={navLabel.prev}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink sm:size-8"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-0 flex-1 truncate px-2 text-center text-sm font-bold text-ink sm:min-w-44 sm:flex-none">
                {formatPeriodLabel(view, focusDate)}
              </span>
              <button
                type="button"
                onClick={() => shiftPeriod(1)}
                aria-label={navLabel.next}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink sm:size-8"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="flex w-full items-center rounded-full border border-hairline bg-paper p-1 min-[420px]:w-auto">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setView(option.id)}
                  className={`h-8 flex-1 cursor-pointer rounded-full px-3 text-[11px] font-bold transition min-[420px]:flex-none ${
                    view === option.id
                      ? 'bg-navy text-white shadow-sm'
                      : 'text-muted hover:bg-surface hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
              <Users className="size-3 shrink-0" /> დადასახდელი
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-ink sm:text-xl">{formatPrice(monthStats.expected)}</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
              <TrendingUp className="size-3 shrink-0" /> გადახდილი
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-win sm:text-xl">{formatPrice(monthStats.paid)}</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
              <AlertCircle className="size-3 shrink-0" /> დავალიანება
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-loss sm:text-xl">{formatPrice(monthStats.debt)}</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-4">
        <div className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-hairline bg-surface p-2.5 shadow-sm sm:rounded-3xl sm:p-4">
          {view === 'month' ? (
            <MonthGrid
              cells={monthGrid}
              focusKey={focusKey}
              today={today}
              lessonsByDate={lessonsByDate}
              payments={payments}
              onSelectDate={goToDate}
            />
          ) : null}

          {view === 'week' ? (
            <WeekGrid
              days={weekGrid}
              focusKey={focusKey}
              today={today}
              lessonsByDate={lessonsByDate}
              payments={payments}
              groups={groups}
              onSelectDate={goToDate}
            />
          ) : null}

          {view === 'day' ? (
            <DayAgenda
              date={focusDate}
              lessons={selectedLessons}
              payments={payments}
              groups={groups}
            />
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-[10px] font-medium text-muted">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-win" /> სრულად</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-brass" /> ნაწილობრივ</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-loss" /> გადაუხდელი</span>
          </div>
        </div>

        <DayLessonPanel
          date={focusDate}
          lessons={selectedLessons}
          groups={groups}
          payments={payments}
          onSelectStudent={onSelectStudent}
          onToggleMissed={onToggleMissed}
          onSetPaid={onSetPaid}
        />
      </div>
    </div>
  );
}

function MonthGrid({
  cells, focusKey, today, lessonsByDate, payments, onSelectDate,
}: {
  cells: { date: Date; inMonth: boolean }[];
  focusKey: string;
  today: Date;
  lessonsByDate: Map<string, DayLesson[]>;
  payments: PaymentRecord[];
  onSelectDate: (date: Date) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1 pb-2">
        {WEEKDAYS_KA.map((d) => (
          <div key={d} className="truncate text-center text-[10px] font-bold tracking-wide text-muted sm:text-[11px]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayLessons = lessonsByDate.get(key) ?? [];
          const sessions = groupDayLessons(dayLessons);
          const isToday = isSameDay(date, today);
          const isSelected = key === focusKey;
          const hasLessons = sessions.length > 0;
          const dot = getDayDot(dayLessons, payments, date);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`group relative flex aspect-square min-h-11 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border transition sm:rounded-xl ${
                isSelected
                  ? 'border-navy bg-navy text-white shadow-md'
                  : isToday
                    ? 'border-brass/50 bg-brass-tint/50 hover:border-brass'
                    : hasLessons
                      ? 'border-hairline bg-paper hover:border-navy/40 hover:bg-navy-tint/40'
                      : 'border-transparent hover:border-hairline hover:bg-paper'
              }`}
            >
              <span
                className={`text-xs font-bold sm:text-sm ${
                  isSelected
                    ? 'text-white'
                    : isToday
                      ? 'text-brass-strong'
                      : !inMonth
                        ? 'text-muted/50'
                        : hasLessons
                          ? 'text-ink'
                          : 'text-muted'
                }`}
              >
                {date.getDate()}
              </span>

              {hasLessons ? (
                <span className={`mt-0.5 hidden items-center gap-0.5 text-[9px] font-bold min-[420px]:flex ${isSelected ? 'text-white/90' : 'text-navy'}`}>
                  <Clock3 className="size-2.5" />
                  {sessions.length}
                </span>
              ) : null}

              {dot !== 'none' ? (
                <span className={`absolute bottom-1 size-1.5 rounded-full ${DOT_CLASS[dot]}`} />
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}

function WeekGrid({
  days, focusKey, today, lessonsByDate, payments, groups, onSelectDate,
}: {
  days: Date[];
  focusKey: string;
  today: Date;
  lessonsByDate: Map<string, DayLesson[]>;
  payments: PaymentRecord[];
  groups: StudentGroup[];
  onSelectDate: (date: Date) => void;
}) {
  return (
    <div className="grid min-h-[20rem] flex-1 grid-cols-7 gap-1 overflow-hidden">
      {days.map((date) => {
        const key = toDateKey(date);
        const dayLessons = lessonsByDate.get(key) ?? [];
        const sessions = groupDayLessons(dayLessons);
        const isToday = isSameDay(date, today);
        const isSelected = key === focusKey;
        const dot = getDayDot(dayLessons, payments, date);

        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => onSelectDate(date)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectDate(date);
              }
            }}
                  className={`flex min-h-0 min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition ${
              isSelected
                ? 'border-navy bg-navy-tint/50 shadow-sm'
                : isToday
                  ? 'border-brass/40 bg-brass-tint/30 hover:border-brass'
                  : 'border-hairline bg-paper hover:border-navy/30 hover:bg-navy-tint/20'
            }`}
          >
            <div className="flex shrink-0 flex-col items-center gap-0.5 border-b border-hairline/80 px-0.5 py-1.5">
              <span className="text-[9px] font-bold tracking-wide text-muted sm:text-[10px]">
                {WEEKDAYS_KA[(date.getDay() + 6) % 7]}
              </span>
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                  isToday ? 'bg-navy text-white' : isSelected ? 'bg-navy/15 text-navy' : 'text-ink'
                }`}
              >
                {date.getDate()}
              </span>
              {dot !== 'none' ? (
                <span className={`size-1.5 rounded-full ${DOT_CLASS[dot]}`} />
              ) : null}
            </div>

            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1">
              {sessions.length === 0 ? (
                <span className="px-0.5 py-2 text-center text-[9px] text-muted/70">—</span>
              ) : (
                sessions.map((session) => (
                  <span
                    key={session.key}
                    className={`block truncate rounded-md px-1 py-0.5 text-[9px] font-bold leading-tight ${
                      isSelected ? 'bg-navy text-white' : 'bg-navy-tint text-navy'
                    }`}
                  >
                    {session.startTime} {sessionChipLabel(session, groups)}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function sessionChipLabel(session: CalendarSession, groups: StudentGroup[]): string {
  if (session.kind === 'group') {
    const name = getGroupName(session.groupId, groups);
    const count = session.lessons.length;
    return count > 1 ? `${name} · ${count}` : name;
  }
  return session.lessons[0]?.student.firstName ?? '—';
}

function DayAgenda({
  date, lessons, payments, groups,
}: {
  date: Date;
  lessons: DayLesson[];
  payments: PaymentRecord[];
  groups: StudentGroup[];
}) {
  const isToday = isSameDay(date, new Date());
  const sessions = useMemo(() => groupDayLessons(lessons), [lessons]);

  return (
    <div className="flex min-h-[20rem] flex-1 flex-col overflow-hidden rounded-xl border border-hairline bg-paper">
      <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-3 py-2.5">
        <span
          className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
            isToday ? 'bg-navy text-white' : 'bg-surface text-ink'
          }`}
        >
          {date.getDate()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ink">{formatDayLabel(date)}</p>
          <p className="text-[11px] font-medium text-muted">
            {sessions.length} გაკვეთილი
            {lessons.length !== sessions.length ? ` · ${lessons.length} მოსწავლე` : ''}
          </p>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="px-2 py-10 text-center text-xs font-medium text-muted">ამ დღეს გაკვეთილი არ არის</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.key} className="flex gap-3">
                <div className="w-12 shrink-0 pt-1 text-right text-[11px] font-bold tabular-nums text-muted">
                  {session.startTime}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 border-l border-hairline pl-3">
                  <p className="rounded-md bg-navy-tint/60 px-1.5 py-0.5 text-[10px] font-bold text-navy">
                    {session.kind === 'group'
                      ? `${getGroupName(session.groupId, groups)} · ${session.lessons.length} მოსწავლე`
                      : 'სახლში'}
                    <span className="ml-1 font-medium text-muted">
                      {session.startTime}–{session.endTime}
                    </span>
                  </p>
                  {session.lessons.map((lesson, idx) => {
                    const monthKey = getMonthKey(date);
                    const paid = sumPaymentsForMonth(payments, lesson.student.id, monthKey);
                    const expected = computeExpectedForMonth(
                      lesson.student,
                      date.getFullYear(),
                      date.getMonth() + 1,
                    );
                    const dKey = toDateKey(date);
                    const missed =
                      lesson.student.priceType === 'PER_LESSON' &&
                      isLessonMissed(lesson.student, lesson.lessonId, dKey);
                    const isPaid = expected <= paid;

                    return (
                      <div
                        key={`${lesson.student.id}-${lesson.lessonId}-${idx}`}
                        className={`rounded-xl border px-2.5 py-2 ${
                          missed
                            ? 'border-loss/30 bg-loss-tint/40'
                            : isPaid
                              ? 'border-win/20 bg-win-tint/40'
                              : paid > 0
                                ? 'border-brass/30 bg-brass-tint/40'
                                : 'border-hairline bg-surface'
                        }`}
                      >
                        <p className={`truncate text-xs font-bold ${missed ? 'text-loss line-through' : 'text-ink'}`}>
                          {lesson.student.firstName} {lesson.student.lastName}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-muted">
                          {missed ? 'გამოტოვა' : isPaid ? 'გადახდილია' : paid > 0 ? 'ნაწილობრივ' : 'გადაუხდელი'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayLessonPanel({
  date, lessons, groups, payments, onSelectStudent, onToggleMissed, onSetPaid,
}: {
  date: Date;
  lessons: DayLesson[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  onSelectStudent?: (student: StudentRecord) => void;
  onToggleMissed?: (
    studentId: string,
    lessonId: string,
    date: string,
    missed: boolean,
  ) => void;
  onSetPaid: (studentId: string, monthKey: string, amount: number) => void;
}) {
  const monthKey = getMonthKey(date);
  const { year, month } = parseMonthKey(monthKey);
  const dKey = toDateKey(date);
  const sessions = groupDayLessons(lessons);

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-hairline bg-surface shadow-sm sm:rounded-3xl">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div>
          <p className="text-xs font-bold text-ink sm:text-sm">
            {date.getDate()} {formatMonthLabel(monthKey)}
          </p>
          <p className="text-[11px] font-medium text-muted">
            {sessions.length} გაკვეთილი
            {lessons.length !== sessions.length ? ` · ${lessons.length} მოსწავლე` : ''}
          </p>
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-brass-tint text-brass-strong">
          <CalendarDays className="size-4" />
        </span>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <p className="px-2 py-10 text-center text-xs font-medium text-muted">ამ დღეს გაკვეთილი არ არის</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.key} className="space-y-2">
                <p className="flex items-center gap-1.5 rounded-lg bg-navy-tint/70 px-2 py-1 text-[10px] font-bold tracking-wide text-navy">
                  <Clock3 className="size-3" />
                  {session.startTime}–{session.endTime}
                  <span className="font-medium text-muted">
                    · {session.kind === 'group' ? getGroupName(session.groupId, groups) : 'სახლში'}
                    {session.lessons.length > 1 ? ` · ${session.lessons.length}` : ''}
                  </span>
                </p>
                {session.lessons.map(({ student, lessonId, startTime, endTime, groupId }, idx) => {
              const expected = computeExpectedForMonth(student, year, month);
              const paid = sumPaymentsForMonth(payments, student.id, monthKey);
              const owed = Math.max(0, expected - paid);
              const isPaid = owed === 0;

              const isPerLesson = student.priceType === 'PER_LESSON';
              const missed = isPerLesson && isLessonMissed(student, lessonId, dKey);

              return (
                <div
                  key={`${student.id}-${lessonId}-${idx}`}
                  className={`rounded-2xl border p-3 transition ${
                    missed
                      ? 'border-loss/30 bg-loss-tint/30'
                      : 'border-hairline bg-paper hover:border-navy/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectStudent?.(student)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <p className={`truncate text-xs font-bold ${missed ? 'text-loss line-through' : 'text-ink'}`}>
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-medium text-muted">
                        <span className="flex items-center gap-1">
                          <Clock3 className="size-2.5" />
                          {startTime}–{endTime}
                        </span>
                        <span className="text-navy">•</span>
                        <span>{getGroupName(groupId, groups)}</span>
                      </p>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {isPerLesson && onToggleMissed && (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleMissed(student.id, lessonId, dKey, !missed)
                          }
                          title={missed ? 'დასწრებულად მონიშვნა' : 'გამოტოვებულად მონიშვნა'}
                          className={`flex size-8 cursor-pointer items-center justify-center rounded-lg border transition ${
                            missed
                              ? 'border-win/40 bg-win-tint text-win hover:bg-win/20'
                              : 'border-loss/30 bg-surface text-loss hover:bg-loss-tint'
                          }`}
                        >
                          {missed ? (
                            <UserCheck className="size-3.5" />
                          ) : (
                            <UserX className="size-3.5" />
                          )}
                        </button>
                      )}

                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          missed
                            ? 'border-loss/30 bg-loss-tint text-loss'
                            : isPaid
                              ? 'border-win/20 bg-win-tint text-win'
                              : paid > 0
                                ? 'border-brass/30 bg-brass-tint text-brass-strong'
                                : 'border-loss/20 bg-loss-tint text-loss'
                        }`}
                      >
                        {missed ? 'გამოტოვა' : isPaid ? '✓' : paid > 0 ? 'ნაწილ.' : 'ვალი'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2">
                    <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold text-muted">
                      <Wallet className="size-3 shrink-0 text-brass-strong" />
                      <span className="truncate">
                        ფასი: {formatPrice(student.monthlyPrice)}
                        {isPerLesson && (
                          <span className="text-[9px] font-normal"> / გაკვეთილი</span>
                        )}
                        {student.priceType === 'WEEKLY' && (
                          <span className="text-[9px] font-normal"> / კვირა</span>
                        )}
                        {student.priceType === 'BIWEEKLY' && (
                          <span className="text-[9px] font-normal"> / 2 კვირა</span>
                        )}
                      </span>
                    </div>
                    <EditableAmount
                      value={paid}
                      onSave={(v) => onSetPaid(student.id, monthKey, v)}
                      className={isPaid ? 'text-win hover:bg-win-tint' : 'text-loss hover:bg-loss-tint'}
                    />
                  </div>
                </div>
              );
            })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
