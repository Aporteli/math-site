'use client';

import { Users } from 'lucide-react';
import { formatPrice } from '../../studentList.helpers';
import { AmountBar } from './AmountBar';
import { StudentRankBadge } from './StudentRankBadge';
import type { MonthlyStudentRow } from './reports.types';

export function MonthlyStudentList({ students, totalPaid }: { students: MonthlyStudentRow[]; totalPaid: number }) {
  return (
    <div className="rounded-box border border-hairline bg-surface shadow-sm sm:rounded-box">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <Users className="size-4 text-brass-strong" />
        <p className="text-sm font-bold text-ink">ვინ გადაიხადა ({students.length})</p>
      </div>

      {students.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs font-medium text-muted">ამ თვეში ჯერ არავის გადაუხდია</p>
      ) : (
        <div className="divide-y divide-hairline">
          {students.map(({ student, paid, count }, idx) => {
            const pct = totalPaid > 0 ? (paid / totalPaid) * 100 : 0;
            return (
              <div key={student.id} className="flex items-center gap-3 px-4 py-3">
                <StudentRankBadge index={idx} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-bold text-ink">
                      {student.firstName} {student.lastName}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <AmountBar
                      pct={pct}
                      trackClassName="relative h-1.5 w-full max-w-[140px] overflow-hidden rounded-box bg-paper-deep"
                      barClassName="absolute inset-y-0 left-0 rounded-box bg-win"
                    />
                    <span className="text-[10px] font-bold tabular-nums text-muted">{count} ოპერაცია</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-black tabular-nums text-win sm:text-base">{formatPrice(paid)}</p>
                  <p className="text-[10px] font-medium tabular-nums text-muted">{pct.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
