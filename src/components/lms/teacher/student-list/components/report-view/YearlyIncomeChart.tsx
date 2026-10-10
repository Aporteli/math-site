'use client';

import { TrendingUp } from 'lucide-react';
import { formatPrice } from '../../studentList.helpers';
import { ChartBarTooltip } from './ChartBarTooltip';
import { ChartGridlines } from './ChartGridlines';
import { ChartLegend } from './ChartLegend';
import { ChartYAxis } from './ChartYAxis';
import { CHART_HEIGHT } from './reports.constants';
import { getNiceScale } from './reports.helpers';
import type { MonthStat } from './reports.types';

const YEARLY_LEGEND = [
  { swatchClass: 'bg-win', label: 'თვე' },
  { swatchClass: 'bg-brass', label: 'მიმდინარე თვე' },
];

export function YearlyIncomeChart({
  year,
  monthStats,
  maxMonth,
  best,
  currentMonth,
}: {
  year: number;
  monthStats: MonthStat[];
  maxMonth: number;
  best: MonthStat;
  currentMonth: number;
}) {
  const { max: scaleMax, ticks } = getNiceScale(maxMonth);

  return (
    <div className="rounded-box border border-hairline bg-surface p-4 shadow-sm sm:rounded-box sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-brass-strong" />
          <p className="text-sm font-bold text-ink">{year} წლის შემოსავალი</p>
        </div>
        {best.total > 0 && (
          <div className=" px-2.5 py-1 text-[10px] font-bold text-brass-strong">
            საუკეთესო: {best.label} ({formatPrice(best.total)})
          </div>
        )}
      </div>

      <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-2">
        <ChartYAxis ticks={ticks} scaleMax={scaleMax} />

        <div className="relative min-w-0 flex-1">
          <ChartGridlines ticks={ticks} scaleMax={scaleMax} />

          <div className="relative flex items-end gap-1.5" style={{ height: CHART_HEIGHT }}>
            {monthStats.map((m) => {
              const isCurrent = m.monthIndex === currentMonth;
              const isEmpty = m.total === 0;

              const ratio = scaleMax > 0 ? m.total / scaleMax : 0;
              const heightPx = Math.max(isEmpty ? 2 : 8, ratio * CHART_HEIGHT);

              return (
                <div key={m.monthKey} className="group relative flex min-w-[28px] flex-1 flex-col items-center">
                  {m.total > 0 && <ChartBarTooltip amount={m.total} />}
                  <div
                    className={`w-full rounded-box transition-all ${
                      isEmpty ? 'bg-paper-deep' : isCurrent ? 'bg-brass hover:bg-brass-strong' : 'bg-win'
                    }`}
                    style={{ height: `${heightPx}px` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-1.5 pt-1">
            {monthStats.map((m) => {
              const isCurrent = m.monthIndex === currentMonth;
              return (
                <div
                  key={m.monthKey}
                  className={`min-w-[28px] flex-1 text-center text-[9px] font-bold sm:text-[10px] ${
                    isCurrent ? 'text-brass-strong' : 'text-muted'
                  }`}>
                  {m.label.slice(0, 3)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ChartLegend items={YEARLY_LEGEND} />
    </div>
  );
}
