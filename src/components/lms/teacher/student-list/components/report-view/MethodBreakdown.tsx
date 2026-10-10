'use client';

import { Wallet } from 'lucide-react';
import { formatPrice } from '../../studentList.helpers';
import { METHOD_COLOR, METHOD_ICON, METHOD_LABEL } from './reports.constants';
import type { MethodTotals } from './reports.types';

export function MethodBreakdown({ title, byMethod, total }: { title: string; byMethod: MethodTotals; total: number }) {
  return (
    <div className="rounded-box border border-hairline bg-surface p-4 shadow-sm sm:rounded-box sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="size-4 text-brass-strong" />
        <p className="text-sm font-bold text-ink">{title}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        {(Object.keys(METHOD_LABEL) as (keyof typeof METHOD_LABEL)[]).map((m) => {
          const Icon = METHOD_ICON[m];
          const info = byMethod[m];
          const pct = total > 0 ? (info.amount / total) * 100 : 0;
          return (
            <div key={m} className={`rounded-box border px-3 py-3 ${METHOD_COLOR[m]}`}>
              <div className="flex items-center gap-2">
                <Icon className="size-3.5 shrink-0" />
                <span className="text-[11px] font-bold">{METHOD_LABEL[m]}</span>
              </div>
              <p className="mt-1.5 truncate text-lg font-black tabular-nums">{formatPrice(info.amount)}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium opacity-80">
                <span>{info.count} ოპერაცია</span>
                {total > 0 && (
                  <>
                    <span>·</span>
                    <span className="tabular-nums">{pct.toFixed(0)}%</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
