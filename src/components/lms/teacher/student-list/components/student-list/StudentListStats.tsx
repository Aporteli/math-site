'use client';

import { formatPrice } from '../../studentList.helpers';
import type { ListStats } from './types';

interface StudentListStatsProps {
  studentCount: number;
  stats: ListStats;
}

export function StudentListStats({ studentCount, stats }: StudentListStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
        <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">მოსწავლეები</p>
        <p className="mt-1 truncate text-lg font-bold tabular-nums text-ink sm:text-xl">{studentCount}</p>
      </div>
      <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
        <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">გაკვეთილები</p>
        <p className="mt-1 truncate text-lg font-bold tabular-nums text-[#465D73] sm:text-xl">{stats.todayCount}</p>
      </div>
      <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
        <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">ჯამში</p>
        <p className="mt-1 truncate text-base font-bold tabular-nums text-ink sm:text-xl">{formatPrice(stats.totalPrice)}</p>
      </div>
      <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
        <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">გადასახდელი</p>
        <p className="mt-1 truncate text-base font-bold tabular-nums text-loss sm:text-xl">{formatPrice(stats.debt)}</p>
      </div>
    </div>
  );
}
