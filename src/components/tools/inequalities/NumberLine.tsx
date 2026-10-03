'use client';

import { useMemo } from 'react';
import type { IneqInterval } from './inequalities';

interface Props {
  criticalPoints: number[];
  intervals: IneqInterval[];
}

const W = 640;
const H = 90;
const PAD = 50;
const BASE_Y = 45;

export function NumberLine({ criticalPoints, intervals }: Props) {
  const { xMin, xMax } = useMemo(() => {
    if (criticalPoints.length === 0) {
      return { xMin: -5, xMax: 5 };
    }
    const lo = Math.min(...criticalPoints);
    const hi = Math.max(...criticalPoints);
    const span = hi - lo || 2;
    const pad = Math.max(1, span * 0.35);
    return { xMin: lo - pad, xMax: hi + pad };
  }, [criticalPoints]);

  const toX = (v: number) =>
    PAD + ((v - xMin) / (xMax - xMin)) * (W - 2 * PAD);

  const cpSet = criticalPoints;

  return (
    <div className="w-full overflow-x-auto rounded-box border border-hairline bg-main p-3 text-ink">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        style={{ minWidth: 480 }}
        role="img"
        aria-label="რიცხვითი ღერძი">
        {/* Baseline */}
        <line
          x1={PAD - 20}
          y1={BASE_Y}
          x2={W - PAD + 20}
          y2={BASE_Y}
          stroke="currentColor"
          strokeWidth={1.5}
          opacity={0.55}
        />
        <polygon
          points={`${PAD - 20},${BASE_Y} ${PAD - 12},${BASE_Y - 4} ${PAD - 12},${BASE_Y + 4}`}
          fill="currentColor"
          opacity={0.55}
        />
        <polygon
          points={`${W - PAD + 20},${BASE_Y} ${W - PAD + 12},${BASE_Y - 4} ${W - PAD + 12},${BASE_Y + 4}`}
          fill="currentColor"
          opacity={0.55}
        />

        {/* Shaded intervals */}
        {intervals.map((iv, i) => {
          if (iv.isPoint) {
            const x = iv.startNum !== null ? toX(iv.startNum) : 0;
            return (
              <circle key={i} cx={x} cy={BASE_Y} r={6} fill="#465D73" />
            );
          }
          const x1 = iv.startNum === null ? PAD - 20 : toX(iv.startNum);
          const x2 = iv.endNum === null ? W - PAD + 20 : toX(iv.endNum);
          return (
            <line
              key={i}
              x1={x1}
              x2={x2}
              y1={BASE_Y}
              y2={BASE_Y}
              stroke="#465D73"
              strokeWidth={7}
              strokeLinecap="round"
            />
          );
        })}

        {/* Critical point markers */}
        {cpSet.map((cp, i) => {
          const x = toX(cp);
          const included = intervals.some(
            (iv) =>
              (iv.startNum === cp && !iv.startOpen) ||
              (iv.endNum === cp && !iv.endOpen),
          );
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={BASE_Y}
                r={6}
                fill={included ? '#465D73' : 'var(--color-main)'}
                stroke="#465D73"
                strokeWidth={2.5}
              />
              <text
                x={x}
                y={BASE_Y + 26}
                textAnchor="middle"
                fontSize={12}
                fill="currentColor"
                fontFamily="ui-monospace, monospace">
                {Number.isInteger(cp) ? cp : cp.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}