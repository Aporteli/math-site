import { sumPaymentsForMonth } from '../../paymentCalendar.helpers';
import type { PaymentRecord, StudentRecord } from '../../studentList.types';
import { emptyMethodTotals } from './reports.helpers';
import type { MonthlyReportData } from './reports.types';

export function buildMonthlyReport(
  payments: PaymentRecord[],
  students: StudentRecord[],
  monthKey: string,
  year: number,
  month: number,
): MonthlyReportData {
  const monthPayments = payments.filter((p) => p.monthKey === monthKey);

  const totalPaid = monthPayments.reduce((s, p) => s + p.amount, 0);
  const paymentCount = monthPayments.length;

  const byMethod = emptyMethodTotals();

  monthPayments.forEach((p) => {
    const m = p.method ?? 'cash';
    if (byMethod[m]) {
      byMethod[m].count += 1;
      byMethod[m].amount += p.amount;
    }
  });

  const byStudent = students
    .map((s) => {
      const paid = sumPaymentsForMonth(payments, s.id, monthKey);
      const monthCount = monthPayments.filter((p) => p.studentId === s.id).length;
      return { student: s, paid, count: monthCount };
    })
    .filter((r) => r.paid > 0)
    .sort((a, b) => b.paid - a.paid);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyIncome = Array.from({ length: daysInMonth }, () => 0);
  monthPayments.forEach((p) => {
    const d = new Date(p.paidAt).getDate();
    if (d >= 1 && d <= daysInMonth) {
      dailyIncome[d - 1] += p.amount;
    }
  });
  const maxDaily = Math.max(0, ...dailyIncome);

  return {
    totalPaid,
    paymentCount,
    byMethod,
    byStudent,
    dailyIncome,
    maxDaily,
    daysInMonth,
  };
}
