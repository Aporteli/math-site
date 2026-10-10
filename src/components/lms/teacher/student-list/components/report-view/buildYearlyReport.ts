import { MONTH_NAMES_KA } from '../../paymentCalendar.helpers';
import type { PaymentRecord, StudentRecord } from '../../studentList.types';
import { emptyMethodTotals } from './reports.helpers';
import type { YearlyReportData } from './reports.types';

export function buildYearlyReport(payments: PaymentRecord[], students: StudentRecord[], year: number): YearlyReportData {
  const monthStats = MONTH_NAMES_KA.map((label, idx) => {
    const mk = `${year}-${String(idx + 1).padStart(2, '0')}`;
    const monthPayments = payments.filter((p) => p.monthKey === mk);
    const total = monthPayments.reduce((s, p) => s + p.amount, 0);
    const count = monthPayments.length;
    return { label, monthIndex: idx + 1, monthKey: mk, total, count };
  });

  const yearTotal = monthStats.reduce((s, m) => s + m.total, 0);
  const yearCount = monthStats.reduce((s, m) => s + m.count, 0);
  const maxMonth = Math.max(0, ...monthStats.map((m) => m.total));
  const avgMonth = yearTotal / 12;

  const best = [...monthStats].sort((a, b) => b.total - a.total)[0];

  const yearPayments = payments.filter((p) => p.monthKey.startsWith(`${year}-`));
  const byMethod = emptyMethodTotals();
  yearPayments.forEach((p) => {
    const m = p.method ?? 'cash';
    if (byMethod[m]) {
      byMethod[m].count += 1;
      byMethod[m].amount += p.amount;
    }
  });

  const byStudent = students
    .map((s) => {
      const paid = yearPayments.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + p.amount, 0);
      return { student: s, paid };
    })
    .filter((r) => r.paid > 0)
    .sort((a, b) => b.paid - a.paid);

  return {
    monthStats,
    yearTotal,
    yearCount,
    maxMonth,
    avgMonth,
    best,
    byMethod,
    byStudent,
  };
}
