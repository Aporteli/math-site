'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle, Users, TrendingUp, ChevronLeft, ChevronRight,
  Phone, Receipt, User as UserIcon,
} from 'lucide-react';
import {
  formatMonthLabel, shiftMonth, parseMonthKey,
  sumPaymentsForMonth, computeExpectedForMonth,
} from '../paymentCalendar.helpers';
import { formatPrice, getGroupName } from '../studentList.helpers';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../studentList.types';

interface Props {
  students: StudentRecord[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  onMonthChange: (key: string) => void;
  onManagePayments: (s: StudentRecord) => void;
  onEditPhones: (s: StudentRecord) => void;
}

type FilterMode = 'debtors' | 'all' | 'paid';

export function DebtTracker({
  students,
  groups,
  payments,
  monthKey,
  onMonthChange,
  onManagePayments,
  onEditPhones,
}: Props) {
  const [filter, setFilter] = useState<FilterMode>('debtors');
  const { year, month } = parseMonthKey(monthKey);

  /* ── Compute per-student debt rows ── */
  const rows = useMemo(() => {
    return students
      .map((s) => {
        const expected = computeExpectedForMonth(s, year, month);
        const paid = sumPaymentsForMonth(payments, s.id, monthKey);
        const debt = Math.max(0, expected - paid);
        return { student: s, expected, paid, debt };
      })
      .sort((a, b) => b.debt - a.debt);
  }, [students, payments, monthKey, year, month]);

  const filtered = useMemo(() => {
    if (filter === 'debtors') return rows.filter((r) => r.debt > 0);
    if (filter === 'paid')
      return rows.filter((r) => r.debt === 0 && r.expected > 0);
    return rows;
  }, [rows, filter]);

  const stats = useMemo(() => {
    const totalExpected = rows.reduce((sum, r) => sum + r.expected, 0);
    const totalPaid = rows.reduce((sum, r) => sum + r.paid, 0);
    const totalDebt = rows.reduce((sum, r) => sum + r.debt, 0);
    const debtorsCount = rows.filter((r) => r.debt > 0).length;
    const paidCount = rows.filter((r) => r.debt === 0 && r.expected > 0).length;
    return { totalExpected, totalPaid, totalDebt, debtorsCount, paidCount };
  }, [rows]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      {/* ═══ Header ═══ */}
      <div className="rounded-2xl border border-hairline bg-surface p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-loss-tint text-loss">
              <AlertCircle className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink sm:text-lg">
                დავალიანებები
              </h2>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex w-full items-center gap-1 rounded-full border border-hairline bg-paper p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink sm:size-8"
              aria-label="წინა თვე"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-0 flex-1 truncate px-2 text-center text-sm font-bold text-ink sm:min-w-40 sm:flex-none">
              {formatMonthLabel(monthKey)}
            </span>
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink sm:size-8"
              aria-label="შემდეგი თვე"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* ═══ Stats cards ═══ */}
        <div className="mt-3 grid grid-cols-2 gap-2 min-[480px]:grid-cols-4">
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
              <Users className="size-3 shrink-0" /> დადასახდელი
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-ink sm:text-xl">
              {formatPrice(stats.totalExpected)}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
              <TrendingUp className="size-3 shrink-0" /> გადახდილი
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-win sm:text-xl">
              {formatPrice(stats.totalPaid)}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
              <AlertCircle className="size-3 shrink-0" /> დავალიანება
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-loss sm:text-xl">
              {formatPrice(stats.totalDebt)}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
              <UserIcon className="size-3 shrink-0" /> მოვალეები
            </p>
            <p className="mt-1 truncate text-lg font-bold tabular-nums text-loss sm:text-xl">
              {stats.debtorsCount}
            </p>
          </div>
        </div>

        {/* ═══ Filter tabs ═══ */}
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-hairline bg-paper p-1 sm:w-auto sm:min-w-80">
          {[
            { key: 'debtors' as const, label: 'მოვალეები', count: stats.debtorsCount },
            { key: 'all' as const, label: 'ყველა', count: rows.length },
            { key: 'paid' as const, label: 'გადახდილი', count: stats.paidCount },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-xl px-1.5 py-2 text-xs font-bold transition sm:px-3 ${
                filter === f.key
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-body hover:bg-surface hover:text-ink'
              }`}
            >
              <span className="truncate text-[11px] sm:text-xs">{f.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  filter === f.key
                    ? 'bg-white/20 text-white'
                    : 'bg-paper-deep text-muted'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ List ═══ */}
      <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
            <span
              className={`mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-hairline ${
                filter === 'debtors'
                  ? 'bg-win-tint text-win'
                  : 'bg-navy-tint text-navy'
              }`}
            >
              {filter === 'debtors' ? '🎉' : <AlertCircle className="size-5" />}
            </span>
            <p className="text-sm font-bold text-ink">
              {filter === 'debtors'
                ? 'ვალები არ არის!'
                : filter === 'paid'
                  ? 'ჯერ არავის გადაუხდია'
                  : 'მოსწავლეები არ არიან'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              {filter === 'debtors'
                ? 'ამ თვეში ყველა მოსწავლემ გადაიხადა'
                : 'სცადეთ სხვა ფილტრი'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ student, expected, paid, debt }) => {
              const isIndividual = student.kind === 'individual';
              const initial = student.firstName.charAt(0) || '?';
              const paidRatio = expected > 0 ? Math.min(1, paid / expected) : 0;
              const isPaidFull = debt === 0 && expected > 0;
              const isPartial = paid > 0 && debt > 0;

              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3 shadow-sm transition hover:border-navy/30 hover:shadow-md sm:p-4"
                >
                  {/* Avatar */}
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                      isPaidFull
                        ? 'bg-win-tint text-win'
                        : isPartial
                          ? 'bg-brass-tint text-brass-strong'
                          : 'bg-loss-tint text-loss'
                    }`}
                  >
                    {initial}
                  </span>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-bold text-ink">
                        {student.firstName} {student.lastName}
                      </p>
                      {isIndividual ? (
                        <span className="shrink-0 rounded-full border border-brass/30 bg-brass-tint px-2 py-0.5 text-[9px] font-bold text-brass-strong">
                          სახლში
                        </span>
                      ) : null}
                    </div>

                    {/* Groups */}
                    {!isIndividual && student.groupIds.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                        {student.groupIds
                          .map((gid) => getGroupName(gid, groups))
                          .join(', ')}
                      </p>
                    )}

                    {/* Progress bar */}
                    {expected > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="relative h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-paper-deep">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                              isPaidFull ? 'bg-win' : isPartial ? 'bg-brass' : 'bg-loss'
                            }`}
                            style={{ width: `${paidRatio * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold tabular-nums text-muted">
                          {Math.round(paidRatio * 100)}%
                        </span>
                      </div>
                    )}

                    {/* Phone */}
                    {student.phone && (
                      <button
                        type="button"
                        onClick={() => onEditPhones(student)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-muted transition hover:text-navy"
                      >
                        <Phone className="size-2.5" />
                        <span className="truncate">{student.phone}</span>
                      </button>
                    )}
                  </div>

                  {/* Debt amounts */}
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-medium tabular-nums text-muted">
                      {formatPrice(paid)} / {formatPrice(expected)}
                    </p>
                    <p
                      className={`mt-0.5 text-base font-bold tabular-nums sm:text-lg ${
                        debt > 0 ? 'text-loss' : 'text-win'
                      }`}
                    >
                      {debt > 0 ? formatPrice(debt) : '✓'}
                    </p>
                    <p className="text-[9px] font-medium text-muted">
                      {debt > 0 ? 'ვალი' : 'გადახდილი'}
                    </p>
                  </div>

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={() => onManagePayments(student)}
                    title="გადახდის მართვა"
                    className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-hairline bg-paper text-muted transition hover:border-navy/30 hover:bg-navy-tint hover:text-navy"
                  >
                    <Receipt className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}