'use client';

import { CHART_HEIGHT, Y_AXIS_WIDTH } from './reports.constants';
import { formatCompactCurrency } from './reports.helpers';

export function ChartYAxis({ ticks, scaleMax }: { ticks: number[]; scaleMax: number }) {
  return (
    <div className="relative shrink-0" style={{ height: CHART_HEIGHT, width: Y_AXIS_WIDTH }}>
      {ticks.map((tick) => {
        const pct = scaleMax > 0 ? (tick / scaleMax) * 100 : 0;
        return (
          <span
            key={tick}
            className="absolute right-1 -translate-y-1/2 text-[9px] font-bold tabular-nums text-muted"
            style={{ top: `${100 - pct}%` }}>
            {formatCompactCurrency(tick)}
          </span>
        );
      })}
    </div>
  );
}
