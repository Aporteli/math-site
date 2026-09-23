import type { PaymentRecord, StudentRecord } from './studentList.types';

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