'use client';

import { Clock3, User2, Pencil, UserX, ChevronRight } from 'lucide-react';

import { getGroupName, getTodayLessons, DAY_SHORT } from '../studentList.helpers';

import {
  sumPaymentsForMonth,
  computeExpectedInfo,
  parseMonthKey,
  countMissedInMonth,
} from '../paymentCalendar.helpers';

import type { PaymentRecord, StudentGroup, StudentRecord } from '../studentList.types';

interface Props {
  view: 'grid' | 'table';
  student: StudentRecord;
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  onSelect: (student: StudentRecord) => void;
  onEditLessons: (student: StudentRecord) => void;
  onEditPhones: (student: StudentRecord) => void;
  onManagePayments?: (student: StudentRecord) => void;
  onEditIndividual?: (student: StudentRecord) => void;
  classmateCount?: number;
}

export function StudentListCard({
  view,
  student,
  groups,
  payments,
  monthKey,
  onSelect,
  onEditLessons,
  onEditPhones,
  onManagePayments,
  onEditIndividual,
  classmateCount,
}: Props) {
  const { year, month } = parseMonthKey(monthKey);

  const info = computeExpectedInfo(student, year, month);
  const expected = info.amount;

  const paid = sumPaymentsForMonth(payments, student.id, monthKey);
  const owed = Math.max(0, expected - paid);

  const missedCount = countMissedInMonth(student, year, month);
  const todayLessons = getTodayLessons(student.lessons);

  const initial = student.firstName.charAt(0) || '?';
  const isIndividual = student.kind === 'individual';

  const hasLessonToday = todayLessons.length > 0;

  return (
    <div
      onClick={() => onSelect(student)}
      className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-hairline bg-surface text-left shadow-sm transition-all duration-200 hover:border-navy/40 hover:shadow-md ${
        view === 'grid' ? 'h-full' : ''
      }`}>
      {/* ─── Header: Info & Avatar ─── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-inner transition-colors ${
            hasLessonToday ? 'animate-pulse bg-yellow-200 text-yellow-800' : 'bg-navy-tint text-navy'
          }`}>
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold leading-snug text-ink transition-colors group-hover:text-navy">
              {student.firstName} {student.lastName}
            </h3>
          </div>
        </div>
      </div>

      {/* ─── Groups & Badges ─── */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
        {isIndividual ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditIndividual?.(student);
            }}
            className="rounded-lg border border-hairline bg-paper px-2.5 py-0.5 text-[10px] font-bold transition hover:border-navy/30 hover:bg-navy-tint">
            რედაქტირება
          </button>
        ) : student.groupIds.length > 0 ? (
          student.groupIds.map((gid) => (
            <span
              key={gid}
              className="rounded-lg border border-hairline bg-paper px-2.5 py-0.5 text-[10px] font-bold text-body">
              {getGroupName(gid, groups)}
            </span>
          ))
        ) : (
          <span className="rounded-lg bg-paper-deep px-2.5 py-0.5 text-[10px] font-medium text-muted">
            ჯგუფის გარეშე
          </span>
        )}

        {missedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-loss/20 bg-loss-tint px-2 py-0.5 text-[10px] font-bold text-loss">
            <UserX className="size-3" />
            {missedCount} გამოტ.
          </span>
        )}
      </div>

      {/* ─── Payment Section ─── */}
      <div className="mt-auto border-t border-hairline bg-paper/40 p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onManagePayments?.(student);
          }}
          className="w-full rounded-xl border border-hairline/60 bg-surface p-3 text-left transition hover:border-navy/30 hover:bg-navy-tint/30 active:scale-[0.99]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-muted">ფასი / მოსალოდნელი</p>

              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-sm font-bold tabular-nums text-ink">
                  {student.monthlyPrice > 0 ? `${student.monthlyPrice.toLocaleString('ka-GE')} ₾` : '—'}
                </span>

                <span className="truncate text-[10px] font-semibold text-navy">
                  {info.unitLabel === 'თვე' ? `${expected} ₾ / თვე` : `${info.units} ${info.unitLabel} · ${expected} ₾`}
                </span>
              </div>
            </div>

            <div className="shrink-0 border-l border-hairline pl-3 text-right">
              <p className="text-[10px] font-medium text-muted">გადახდილი</p>

              <p className={`mt-0.5 text-sm font-bold tabular-nums ${paid > 0 ? 'text-win' : 'text-muted'}`}>
                {paid > 0 ? `${paid} ₾` : '—'}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* ─── Schedule Section ─── */}
      <div className="h-[155px] overflow-y-auto border-t border-hairline px-4 py-3 thin-scrollbar">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold">
            {!isIndividual && classmateCount && classmateCount > 1 ? (
              <span className="font-semibold">{classmateCount} მოსწავლე</span>
            ) : null}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditLessons(student);
            }}
            title="გაკვეთილის დროების რედაქტირება"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition active:scale-[0.97] hover:border-navy/40 hover:bg-navy-tint">
            <span>შეცვლა</span>
            <ChevronRight className="size-3" />
          </button>
        </div>

        {student.lessons.length === 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditLessons(student);
            }}
            className="w-full rounded-lg border border-dashed border-hairline bg-paper/60 py-2 text-center text-xs font-semibold text-muted transition hover:border-navy/40 hover:bg-navy-tint hover:text-navy">
            + გაკვეთილის დამატება
          </button>
        ) : (
          <div className="space-y-1.5">
            {student.lessons.slice(0, 3).map((l) => {
              const isToday = todayLessons.some((tl) => tl.id === l.id);

              return (
                <div
                  key={l.id}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                    isToday ? 'bg-navy-tint font-bold text-navy shadow-sm' : 'bg-paper text-body'
                  }`}>
                  <span>{DAY_SHORT[l.dayOfWeek]}</span>

                  <span className="tabular-nums font-medium">
                    {l.startTime}–{l.endTime}
                  </span>
                </div>
              );
            })}

            {student.lessons.length > 3 && (
              <p className="px-1 pt-0.5 text-[10px] font-medium text-muted">+{student.lessons.length - 3} კიდევ</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
