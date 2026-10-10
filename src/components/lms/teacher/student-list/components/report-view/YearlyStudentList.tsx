'use client';

import { formatPrice } from '../../studentList.helpers';
import { StudentRankBadge } from './StudentRankBadge';
import type { YearlyStudentRow } from './reports.types';

export function YearlyStudentList({ students, yearTotal }: { students: YearlyStudentRow[]; yearTotal: number }) {
  return (
    <div className="rounded-box border border-hairline bg-surface shadow-sm sm:rounded-box">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <p className="text-sm font-bold text-ink">მოსწავლეები ({students.length})</p>
      </div>

      {students.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs font-medium text-muted">ამ წელს ჯერ არავის გადაუხდია</p>
      ) : (
        <div className="divide-y divide-hairline">
          {students.slice(0, 10).map(({ student, paid }, idx) => {
            const pct = yearTotal > 0 ? (paid / yearTotal) * 100 : 0;
            return (
              <div key={student.id} className="flex items-center gap-3 px-4 py-3">
                <StudentRankBadge index={idx} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-bold text-ink">
                      {student.firstName} {student.lastName}
                    </p>
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
