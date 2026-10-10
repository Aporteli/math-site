'use client';

import { CHART_HEIGHT } from './reports.constants';

export function ChartGridlines({ ticks, scaleMax }: { ticks: number[]; scaleMax: number }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: CHART_HEIGHT }}>
      {ticks.map((tick) => {
        const pct = scaleMax > 0 ? (tick / scaleMax) * 100 : 0;
        const isTop = tick === scaleMax;
        const isBottom = tick === 0;
        return (
          <div
            key={tick}
            className={`absolute left-0 right-0 border-t ${
              isBottom ? 'border-hairline' : isTop ? 'border-hairline' : 'border-hairline/40 border-dashed'
            }`}
            style={{ top: `${100 - pct}%` }}
          />
        );
      })}
    </div>
  );
}
