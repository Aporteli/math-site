import type {
  MissedLesson,
  PaymentRecord,
  PriceType,
  StudentRecord,
} from './studentList.types';

export const MONTH_NAMES_KA = [
  'იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი',
  'ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი',
];

export const WEEKDAYS_KA = ['ორშ','სამ','ოთხ','ხუთ','პარ','შაბ','კვი'];

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m };
}

export function formatMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES_KA[month - 1]} ${year}`;
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  return getMonthKey(new Date(year, month - 1 + delta, 1));
}

export type CalendarView = 'day' | 'week' | 'month';

export function toDateKey(date: Date): string {
  return padDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const js = d.getDay();
  const offset = js === 0 ? -6 : 1 - js;
  return addDays(d, offset);
}

export function weekDates(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthCells(
  year: number,
  month: number,
): { date: Date; inMonth: boolean }[] {
  const firstJsDay = new Date(year, month - 1, 1).getDay();
  const leading = (firstJsDay === 0 ? 7 : firstJsDay) - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = leading; i > 0; i--) {
    cells.push({ date: new Date(year, month - 1, 1 - i), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month - 1, day), inMonth: true });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let day = 1; day <= 7 - remainder; day++) {
      cells.push({ date: new Date(year, month, day), inMonth: false });
    }
  }
  return cells;
}

export function shiftByView(date: Date, view: CalendarView, delta: number): Date {
  if (view === 'day') return addDays(date, delta);
  if (view === 'week') return addDays(date, delta * 7);
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const dim = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  return new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    Math.min(date.getDate(), dim),
  );
}

export function formatDayLabel(date: Date): string {
  const js = date.getDay();
  const dow = js === 0 ? 7 : js;
  return `${WEEKDAYS_KA[dow - 1]}, ${date.getDate()} ${MONTH_NAMES_KA[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatWeekLabel(date: Date): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES_KA[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTH_NAMES_KA[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_KA[end.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTH_NAMES_KA[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTH_NAMES_KA[end.getMonth()]} ${end.getFullYear()}`;
}

export function formatPeriodLabel(view: CalendarView, date: Date): string {
  if (view === 'day') return formatDayLabel(date);
  if (view === 'week') return formatWeekLabel(date);
  return formatMonthLabel(getMonthKey(date));
}

export function sumPaymentsForMonth(
  payments: PaymentRecord[],
  studentId: string,
  monthKey: string,
): number {
  return payments
    .filter((p) => p.studentId === studentId && p.monthKey === monthKey)
    .reduce((s, p) => s + p.amount, 0);
}

/* ═══════════════════ Date key ═══════════════════ */

export function padDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ═══════════════════ Missed lessons ═══════════════════ */

export function isLessonMissed(
  student: StudentRecord,
  lessonId: string,
  date: string,
): boolean {
  return (
    student.missedLessons?.some(
      (m) => m.lessonId === lessonId && m.date === date,
    ) ?? false
  );
}

export function countMissedInMonth(
  student: StudentRecord,
  year: number,
  month: number,
): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return (
    student.missedLessons?.filter((m) => m.date.startsWith(prefix)).length ?? 0
  );
}

/* ═══════════════════ Billing start day ═══════════════════ */

/**
 * ათვლის დაწყების დღე:
 * - მიმდინარე თვე → დღევანდელი დღე
 * - წარსული თვე  → 1
 * - მომავალი თვე → 1
 */
function getBillingStartDay(year: number, month: number): number {
  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  return isCurrentMonth ? now.getDate() : 1;
}

/* ═══════════════════ Count helpers ═══════════════════ */

/**
 * გაკვეთილის დღეების რაოდენობა დღევანდელი დღიდან თვის ბოლომდე.
 * გამოტოვებული დღეები (სადაც ყველა გაკვეთილი გამოტოვებულია) არ ითვლება.
 */
export function countLessonsFromToday(
  student: StudentRecord,
  year: number,
  month: number,
): number {
  const startDay = getBillingStartDay(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  let count = 0;
  for (let day = startDay; day <= daysInMonth; day++) {
    const js = new Date(year, month - 1, day).getDay();
    const dow = js === 0 ? 7 : js;
    const lessonsToday = student.lessons.filter((l) => l.dayOfWeek === dow);
    if (lessonsToday.length === 0) continue;

    const dKey = padDateKey(year, month, day);
    // თუ მინიმუმ 1 გაკვეთილი დასწრებულია → დღე ითვლება
    const anyAttended = lessonsToday.some(
      (l) => !isLessonMissed(student, l.id, dKey),
    );
    if (anyAttended) count++;
  }
  return count;
}

/**
 * კვირების რაოდენობა (WEEKLY).
 */
export function countWeeksFromToday(
  student: StudentRecord,
  year: number,
  month: number,
): number {
  const startDay = getBillingStartDay(year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const weekKeys = new Set<string>();

  for (let day = startDay; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const js = date.getDay();
    const dow = js === 0 ? 7 : js;

    if (student.lessons.some((l) => l.dayOfWeek === dow)) {
      weekKeys.add(isoWeekKey(date));
    }
  }
  return weekKeys.size;
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

/* ═══════════════════ Expected amount ═══════════════════ */

export function computeExpectedForMonth(
  student: StudentRecord,
  year: number,
  month: number,
): number {
  const type: PriceType = student.priceType ?? 'MONTHLY';

  if (type === 'MONTHLY') return student.monthlyPrice;
  if (type === 'WEEKLY') {
    return student.monthlyPrice * countWeeksFromToday(student, year, month);
  }
  if (type === 'BIWEEKLY') {
    const weeks = countWeeksFromToday(student, year, month);
    return student.monthlyPrice * Math.ceil(weeks / 2);
  }
  // PER_LESSON — გამოტოვებული აკლდება
  return student.monthlyPrice * countLessonsFromToday(student, year, month);
}

/* ═══════════════════ Expected info (UI-სთვის) ═══════════════════ */

export interface ExpectedInfo {
  amount: number;
  units: number;
  unitLabel: string;
}

export function computeExpectedInfo(
  student: StudentRecord,
  year: number,
  month: number,
): ExpectedInfo {
  const type: PriceType = student.priceType ?? 'MONTHLY';

  if (type === 'MONTHLY') {
    return { amount: student.monthlyPrice, units: 1, unitLabel: 'თვე' };
  }
  if (type === 'WEEKLY') {
    const weeks = countWeeksFromToday(student, year, month);
    return {
      amount: student.monthlyPrice * weeks,
      units: weeks,
      unitLabel: 'კვირა',
    };
  }
  if (type === 'BIWEEKLY') {
    const weeks = countWeeksFromToday(student, year, month);
    const periods = Math.ceil(weeks / 2);
    return {
      amount: student.monthlyPrice * periods,
      units: periods,
      unitLabel: '2 კვირა',
    };
  }
  const lessons = countLessonsFromToday(student, year, month);
  return {
    amount: student.monthlyPrice * lessons,
    units: lessons,
    unitLabel: 'გაკვეთილი',
  };
}

/* ═══════════════════ Lessons by day ═══════════════════ */

export interface DayLesson {
  student: StudentRecord;
  lessonId: string;
  startTime: string;
  endTime: string;
  groupId: string;
}

export function lessonsForDate(
  students: StudentRecord[],
  date: Date,
): DayLesson[] {
  const js = date.getDay();
  const dow = js === 0 ? 7 : js;
  const list: DayLesson[] = [];
  students.forEach((s) => {
    s.lessons.forEach((l) => {
      if (l.dayOfWeek === dow) {
        list.push({
          student: s,
          lessonId: l.id,
          startTime: l.startTime,
          endTime: l.endTime,
          groupId: l.groupId,
        });
      }
    });
  });
  list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return list;
}

export interface CalendarSession {
  key: string;
  kind: 'group' | 'individual';
  groupId: string;
  startTime: string;
  endTime: string;
  lessons: DayLesson[];
}

export function groupDayLessons(lessons: DayLesson[]): CalendarSession[] {
  const map = new Map<string, CalendarSession>();

  for (const lesson of lessons) {
    const isGroup = lesson.student.kind === 'group' && Boolean(lesson.groupId);
    const key = isGroup
      ? `g:${lesson.groupId}:${lesson.startTime}:${lesson.endTime}`
      : `i:${lesson.student.id}:${lesson.lessonId}`;
    const existing = map.get(key);
    if (existing) {
      existing.lessons.push(lesson);
      continue;
    }
    map.set(key, {
      key,
      kind: isGroup ? 'group' : 'individual',
      groupId: lesson.groupId,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      lessons: [lesson],
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const byTime = a.startTime.localeCompare(b.startTime);
    if (byTime !== 0) return byTime;
    return a.endTime.localeCompare(b.endTime);
  });
}

export function lessonsByDayOfMonth(
  students: StudentRecord[],
  year: number,
  month: number,
): Map<number, DayLesson[]> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const map = new Map<number, DayLesson[]>();

  for (let day = 1; day <= daysInMonth; day++) {
    const list = lessonsForDate(students, new Date(year, month - 1, day));
    if (list.length) map.set(day, list);
  }
  return map;
}

export type DayDot = 'none' | 'paid' | 'partial' | 'unpaid' | 'missed';

export function getDayDot(
  dayLessons: DayLesson[],
  payments: PaymentRecord[],
  date: Date,
): DayDot {
  if (dayLessons.length === 0) return 'none';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthKey = getMonthKey(date);
  const dKey = toDateKey(date);

  const allMissed = dayLessons.every(
    ({ student, lessonId }) =>
      (student.priceType ?? 'MONTHLY') === 'PER_LESSON' &&
      isLessonMissed(student, lessonId, dKey),
  );
  if (allMissed) return 'missed';

  const dayPaid = dayLessons.reduce(
    (sum, { student }) => sum + sumPaymentsForMonth(payments, student.id, monthKey),
    0,
  );
  const dayExpected = dayLessons.reduce((sum, { student, lessonId }) => {
    const type = student.priceType ?? 'MONTHLY';
    const missed = type === 'PER_LESSON' && isLessonMissed(student, lessonId, dKey);
    if (missed) return sum;

    if (type === 'PER_LESSON') return sum + student.monthlyPrice;
    const monthly = computeExpectedForMonth(student, year, month);
    const dim = new Date(year, month, 0).getDate();
    const dailyShare = dim > 0 ? monthly / dim : 0;
    return sum + dailyShare;
  }, 0);

  if (dayExpected > 0 && dayPaid >= dayExpected) return 'paid';
  if (dayPaid > 0 && dayPaid < dayExpected) return 'partial';
  return 'unpaid';
}