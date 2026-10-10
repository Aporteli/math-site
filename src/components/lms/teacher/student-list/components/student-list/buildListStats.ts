import { countTodayLessonSessions } from '../../studentList.helpers';
import { computeExpectedForMonth, parseMonthKey, sumPaymentsForMonth } from '../../paymentCalendar.helpers';
import type { PaymentRecord, StudentRecord } from '../../studentList.types';
import type { ListStats } from './types';

export function buildListStats(students: StudentRecord[], payments: PaymentRecord[], monthKey: string): ListStats {
  const { year, month } = parseMonthKey(monthKey);
  const totalPrice = students.reduce((sum, s) => sum + computeExpectedForMonth(s, year, month), 0);
  const totalPaid = students.reduce((sum, s) => sum + sumPaymentsForMonth(payments, s.id, monthKey), 0);
  const todayCount = countTodayLessonSessions(students);

  return {
    totalPrice,
    totalPaid,
    todayCount,
    debt: Math.max(0, totalPrice - totalPaid),
  };
}
