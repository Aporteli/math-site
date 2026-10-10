'use client';

import { parseMonthKey } from '../../paymentCalendar.helpers';
import { DailyIncomeChart } from './DailyIncomeChart';
import { MethodBreakdown } from './MethodBreakdown';
import { MonthlyStudentList } from './MonthlyStudentList';
import type { MonthlyReportData } from './reports.types';

export function MonthlyReport({ data, monthKey }: { data: MonthlyReportData; monthKey: string }) {
  const { year, month } = parseMonthKey(monthKey);

  return (
    <div className="space-y-3 sm:space-y-4">
      <DailyIncomeChart dailyIncome={data.dailyIncome} maxDaily={data.maxDaily} year={year} month={month} />
      <MethodBreakdown title="გადახდის მეთოდები" byMethod={data.byMethod} total={data.totalPaid} />
      <MonthlyStudentList students={data.byStudent} totalPaid={data.totalPaid} />
    </div>
  );
}
