'use client';

export function AmountBar({
  pct,
  trackClassName,
  barClassName,
}: {
  pct: number;
  trackClassName: string;
  barClassName: string;
}) {
  return (
    <div className={trackClassName}>
      <div className={barClassName} style={{ width: `${pct}%` }} />
    </div>
  );
}
