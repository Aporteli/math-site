'use client';

import { formatPrice } from '../../studentList.helpers';

export function ChartBarTooltip({ amount }: { amount: number }) {
  return (
    <span className="absolute -top-6 z-20 whitespace-nowrap rounded-box bg-[#465D73] px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
      {formatPrice(amount)}
    </span>
  );
}
