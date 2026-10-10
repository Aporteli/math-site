'use client';

import { useMemo, useState } from 'react';
import { parseMonthKey } from '../../paymentCalendar.helpers';
import { buildMonthlyReport } from './buildMonthlyReport';
import { buildYearlyReport } from './buildYearlyReport';
import { MonthlyReport } from './MonthlyReport';
import { ReportsHeader } from './ReportsHeader';
import { YearlyReport } from './YearlyReport';
import type { ReportsMode, ReportsViewProps } from './reports.types';

export function ReportsView({ students, payments, monthKey, onMonthChange }: ReportsViewProps) {
  const [mode, setMode] = useState<ReportsMode>('monthly');
  const { year, month } = parseMonthKey(monthKey);

  const monthlyData = useMemo(
    () => buildMonthlyReport(payments, students, monthKey, year, month),
    [payments, students, monthKey, year, month],
  );

  const yearlyData = useMemo(() => buildYearlyReport(payments, students, year), [payments, students, year]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <ReportsHeader
        mode={mode}
        onModeChange={setMode}
        monthKey={monthKey}
        onMonthChange={onMonthChange}
        year={year}
        month={month}
        monthlyData={monthlyData}
        yearlyData={yearlyData}
      />

      <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        {mode === 'monthly' ? (
          <MonthlyReport data={monthlyData} monthKey={monthKey} />
        ) : (
          <YearlyReport data={yearlyData} year={year} />
        )}
      </div>
    </div>
  );
}
