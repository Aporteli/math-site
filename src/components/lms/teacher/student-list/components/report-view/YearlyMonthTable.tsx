'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { formatPrice } from '../../studentList.helpers';
import { AmountBar } from './AmountBar';
import type { MonthStat } from './reports.types';

export function YearlyMonthTable({
  monthStats,
  yearTotal,
  currentMonth,
}: {
  monthStats: MonthStat[];
  yearTotal: number;
  currentMonth: number;
}) {
  return (
    <div className="overflow-hidden rounded-box border border-hairline bg-surface shadow-sm sm:rounded-box">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <CalendarIcon className="size-4 text-brass-strong" />
        <p className="text-sm font-bold text-ink">თვეების დეტალები</p>
      </div>

      <div className="divide-y divide-hairline">
        {monthStats.map((m) => {
          const isCurrent = m.monthIndex === currentMonth;
          const pct = yearTotal > 0 ? (m.total / yearTotal) * 100 : 0;
          return (
            <div key={m.monthKey} className={`flex items-center gap-3 px-4 py-2.5 ${isCurrent ? 'bg-brass-tint/40' : ''}`}>
              <span className={`w-20 shrink-0 text-xs font-bold ${isCurrent ? 'text-brass-strong' : 'text-ink'}`}>
                {m.label}
              </span>
              <div className="min-w-0 flex-1">
                <AmountBar
                  pct={pct}
                  trackClassName="relative h-1.5 w-full overflow-hidden rounded-box bg-paper-deep"
                  barClassName={`absolute inset-y-0 left-0 rounded-box ${isCurrent ? 'bg-brass' : 'bg-win'}`}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-[10px] font-bold tabular-nums text-muted">{m.count} ოპ.</span>
              <span
                className={`w-24 shrink-0 text-right text-sm font-black tabular-nums ${
                  m.total > 0 ? 'text-win' : 'text-muted'
                }`}>
                {m.total > 0 ? formatPrice(m.total) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
