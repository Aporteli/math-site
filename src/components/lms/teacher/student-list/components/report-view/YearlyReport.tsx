'use client';

import { MethodBreakdown } from './MethodBreakdown';
import { YearlyIncomeChart } from './YearlyIncomeChart';
import { YearlyMonthTable } from './YearlyMonthTable';
import { YearlyStudentList } from './YearlyStudentList';
import type { YearlyReportData } from './reports.types';

export function YearlyReport({ data, year }: { data: YearlyReportData; year: number }) {
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-3 sm:space-y-4">
      <YearlyIncomeChart
        year={year}
        monthStats={data.monthStats}
        maxMonth={data.maxMonth}
        best={data.best}
        currentMonth={currentMonth}
      />
      <YearlyMonthTable monthStats={data.monthStats} yearTotal={data.yearTotal} currentMonth={currentMonth} />
      <MethodBreakdown title="გადახდის მეთოდები (წელი)" byMethod={data.byMethod} total={data.yearTotal} />
      <YearlyStudentList students={data.byStudent} yearTotal={data.yearTotal} />
    </div>
  );
}
