'use client';

import { HOUR_HEIGHT, HOURS } from '../constants';
import { pad } from '../journal-time';

interface HourGutterProps {
  labelClassName: string;
}

export function HourGutter({ labelClassName }: HourGutterProps) {
  return (
    <div className="border-r border-hairline select-none bg-paper/10">
      {HOURS.map((hour) => (
        <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className={labelClassName}>
          {hour !== 0 ? `${pad(hour)}:00` : ''}
        </div>
      ))}
    </div>
  );
}
