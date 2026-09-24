import type { PaymentRecord, PriceType, StudentRecord } from './studentList.types';

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

export function sumPaymentsForMonth(
  payments: PaymentRecord[],
  studentId: string,
  monthKey: string,
): number {
  return payments
    .filter((p) => p.studentId === studentId && p.monthKey === monthKey)
    .reduce((s, p) => s + p.amount, 0);
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
 * გაკვეთილების რაოდენობა დღევანდელი დღიდან თვის ბოლომდე (PER_LESSON).
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
    if (student.lessons.some((l) => l.dayOfWeek === dow)) count++;
  }
  return count;
}

/**
 * კვირების რაოდენობა დღევანდელი დღიდან თვის ბოლომდე,
 * სადაც მოსწავლეს გაკვეთილი აქვს (WEEKLY).
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

/** ISO კვირის გასაღები (YYYY-Www) */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

/* ═══════════════════ Expected amount ═══════════════════ */

/**
 * თვიური expected-ის გამოთვლა priceType-ის მიხედვით.
 * ყველა ტიპი ითვლის დღევანდელი დღიდან თვის ბოლომდე (გარდა MONTHLY).
 */
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
  // PER_LESSON
  return student.monthlyPrice * countLessonsFromToday(student, year, month);
}

/* ═══════════════════ Expected info (UI-სთვის) ═══════════════════ */

export interface ExpectedInfo {
  amount: number;
  units: number;
  unitLabel: string;
}

/**
 * აბრუნებს expected-ის დეტალებს UI-სთვის — თანხა + ერთეულების რაოდენობა.
 */
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

export function lessonsByDayOfMonth(
  students: StudentRecord[],
  year: number,
  month: number,
) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const map = new Map<
    number,
    { student: StudentRecord; startTime: string; endTime: string; groupId: string }[]
  >();

  const dowOf = (day: number) => {
    const js = new Date(year, month - 1, day).getDay();
    return js === 0 ? 7 : js;
  };

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = dowOf(day);
    const list: { student: StudentRecord; startTime: string; endTime: string; groupId: string }[] = [];
    students.forEach((s) => {
      s.lessons.forEach((l) => {
        if (l.dayOfWeek === dow) {
          list.push({ student: s, startTime: l.startTime, endTime: l.endTime, groupId: l.groupId });
        }
      });
    });
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (list.length) map.set(day, list);
  }
  return map;
}