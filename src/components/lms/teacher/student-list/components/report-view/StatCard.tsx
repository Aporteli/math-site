'use client';

import type { LucideIcon } from 'lucide-react';

export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: 'win' | 'ink';
}) {
  const shellClass =
    tone === 'win'
      ? 'min-w-0 rounded-box border border-hairline bg-win-tint/50 px-4 py-3'
      : 'min-w-0 rounded-box border border-hairline bg-paper px-4 py-3';
  const labelClass =
    tone === 'win'
      ? 'flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-win'
      : 'flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted';
  const valueClass =
    tone === 'win'
      ? 'mt-1.5 truncate text-2xl font-black tabular-nums text-win sm:text-3xl'
      : 'mt-1.5 truncate text-2xl font-black tabular-nums text-ink sm:text-3xl';

  return (
    <div className={shellClass}>
      <p className={labelClass}>
        <Icon className="size-3.5 shrink-0" />
        {label}
      </p>
      <p className={valueClass}>{value}</p>
    </div>
  );
}
