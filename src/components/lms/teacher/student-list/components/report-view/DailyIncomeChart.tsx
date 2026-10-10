'use client';

import { BarChart3 } from 'lucide-react';
import { ChartBarTooltip } from './ChartBarTooltip';
import { ChartGridlines } from './ChartGridlines';
import { ChartLegend } from './ChartLegend';
import { ChartYAxis } from './ChartYAxis';
import { CHART_HEIGHT } from './reports.constants';
import { formatCompactCurrency, getNiceScale } from './reports.helpers';

const DAILY_LEGEND = [
  { swatchClass: 'bg-win', label: 'სამუშაო დღე' },
  { swatchClass: 'bg-brass', label: 'შაბათ-კვირა' },
  { swatchClass: 'bg-paper-deep', label: 'გადახდის გარეშე' },
];

export function DailyIncomeChart({
  dailyIncome,
  maxDaily,
  year,
  month,
}: {
  dailyIncome: number[];
  maxDaily: number;
  year: number;
  month: number;
}) {
  const { max: scaleMax, ticks } = getNiceScale(maxDaily);

  return (
    <div className="rounded-box border border-hairline bg-surface p-4 shadow-sm sm:rounded-box sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-brass-strong" />
          <p className="text-sm font-bold text-ink">დღიური შემოსავალი</p>
        </div>
        <div className="text-[10px] font-medium text-muted">max: {formatCompactCurrency(maxDaily)}</div>
      </div>

      <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-2">
        <ChartYAxis ticks={ticks} scaleMax={scaleMax} />

        <div className="relative min-w-0 flex-1">
          <ChartGridlines ticks={ticks} scaleMax={scaleMax} />

          <div className="relative flex items-end gap-1" style={{ height: CHART_HEIGHT }}>
            {dailyIncome.map((amt, idx) => {
              const day = idx + 1;
              const jsDay = new Date(year, month - 1, day).getDay();
              const isWeekend = jsDay === 0 || jsDay === 6;

              const ratio = scaleMax > 0 ? amt / scaleMax : 0;
              const heightPx = Math.max(amt > 0 ? 6 : 2, ratio * CHART_HEIGHT);

              return (
                <div key={day} className="group relative flex min-w-[16px] flex-1 flex-col items-center">
                  {amt > 0 && <ChartBarTooltip amount={amt} />}
                  <div
                    className={`w-full rounded-box transition-all ${
                      amt > 0 ? (isWeekend ? 'bg-brass hover:bg-brass-strong' : 'bg-win') : 'bg-paper-deep'
                    }`}
                    style={{ height: `${heightPx}px` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-1 pt-1">
            {dailyIncome.map((_, idx) => {
              const day = idx + 1;
              const jsDay = new Date(year, month - 1, day).getDay();
              const isWeekend = jsDay === 0 || jsDay === 6;
              return (
                <div
                  key={day}
                  className={`min-w-[16px] flex-1 text-center text-[9px] font-bold tabular-nums ${
                    isWeekend ? 'text-brass-strong' : 'text-muted'
                  }`}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ChartLegend items={DAILY_LEGEND} />
    </div>
  );
}
