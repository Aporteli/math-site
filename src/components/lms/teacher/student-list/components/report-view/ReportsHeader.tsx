'use client';

import { Award, List, Wallet } from 'lucide-react';
import { formatMonthLabel, shiftMonth } from '../../paymentCalendar.helpers';
import { formatPrice } from '../../studentList.helpers';
import { ModeToggle } from './ModeToggle';
import { PeriodNavigator } from './PeriodNavigator';
import { StatCard } from './StatCard';
import type { MonthlyReportData, ReportsMode, YearlyReportData } from './reports.types';

export function ReportsHeader({
  mode,
  onModeChange,
  monthKey,
  onMonthChange,
  year,
  month,
  monthlyData,
  yearlyData,
}: {
  mode: ReportsMode;
  onModeChange: (mode: ReportsMode) => void;
  monthKey: string;
  onMonthChange: (key: string) => void;
  year: number;
  month: number;
  monthlyData: MonthlyReportData;
  yearlyData: YearlyReportData;
}) {
  return (
    <div className="overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <div className="p-3 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <ModeToggle mode={mode} onModeChange={onModeChange} />

            {mode === 'monthly' && (
              <PeriodNavigator
                label={formatMonthLabel(monthKey)}
                labelClassName="min-w-32"
                prevAriaLabel="წინა თვე"
                nextAriaLabel="შემდეგი თვე"
                onPrev={() => onMonthChange(shiftMonth(monthKey, -1))}
                onNext={() => onMonthChange(shiftMonth(monthKey, 1))}
              />
            )}

            {mode === 'yearly' && (
              <PeriodNavigator
                label={year}
                labelClassName="min-w-24"
                prevAriaLabel="წინა წელი"
                nextAriaLabel="შემდეგი წელი"
                onPrev={() => onMonthChange(`${year - 1}-${String(month).padStart(2, '0')}`)}
                onNext={() => onMonthChange(`${year + 1}-${String(month).padStart(2, '0')}`)}
              />
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
          <StatCard
            icon={Wallet}
            tone="win"
            label={mode === 'monthly' ? 'ამ თვის შემოსავალი' : 'ამ წლის შემოსავალი'}
            value={formatPrice(mode === 'monthly' ? monthlyData.totalPaid : yearlyData.yearTotal)}
          />
          <StatCard
            icon={List}
            tone="ink"
            label="გადახდების რაოდენობა"
            value={mode === 'monthly' ? monthlyData.paymentCount : yearlyData.yearCount}
          />
          <StatCard
            icon={Award}
            tone="ink"
            label={mode === 'monthly' ? 'საშუალო გადახდა' : 'თვის საშუალო'}
            value={formatPrice(
              mode === 'monthly'
                ? monthlyData.paymentCount > 0
                  ? monthlyData.totalPaid / monthlyData.paymentCount
                  : 0
                : yearlyData.avgMonth,
            )}
          />
        </div>
      </div>
    </div>
  );
}
