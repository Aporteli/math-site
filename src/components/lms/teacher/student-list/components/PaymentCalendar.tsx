'use client';

import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, Wallet, TrendingUp, AlertCircle, Clock3, Users,
} from 'lucide-react';
import { EditableAmount } from './EditableAmount';
import {
  WEEKDAYS_KA, formatMonthLabel, lessonsByDayOfMonth, parseMonthKey,
  shiftMonth, sumPaymentsForMonth,
} from '../paymentCalendar.helpers';
import { formatPrice, getGroupName } from '../studentList.helpers';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../studentList.types';

interface Props {
  students: StudentRecord[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  onMonthChange: (key: string) => void;
  onSetPaid: (studentId: string, monthKey: string, amount: number) => void;
  onSelectStudent?: (student: StudentRecord) => void;
}

export function PaymentCalendar({
  students, groups, payments, monthKey, onMonthChange, onSetPaid, onSelectStudent,
}: Props) {
  const { year, month } = parseMonthKey(monthKey);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstJsDay = new Date(year, month - 1, 1).getDay();
  const firstMonDay = firstJsDay === 0 ? 7 : firstJsDay;
  const leadingBlanks = firstMonDay - 1;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  const lessonsMap = useMemo(
    () => lessonsByDayOfMonth(students, year, month),
    [students, year, month],
  );

  const monthStats = useMemo(() => {
    let expected = 0, paid = 0;
    students.forEach((s) => {
      expected += s.monthlyPrice;
      paid += sumPaymentsForMonth(payments, s.id, monthKey);
    });
    return { expected, paid, debt: Math.max(0, expected - paid) };
  }, [students, payments, monthKey]);

  const selectedLessons = selectedDay ? lessonsMap.get(selectedDay) ?? [] : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-hairline bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-hairline bg-brass-tint text-brass-strong">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink">გადახდების კალენდარი</h1>
              <p className="text-xs font-medium text-muted">თვის მიხედვით კონტროლი</p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-hairline bg-paper p-1">
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[10rem] px-2 text-center text-sm font-bold text-ink">
              {formatMonthLabel(monthKey)}
            </span>
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              <Users className="size-3" /> უნდა
            </p>
            <p className="mt-1 text-lg font-bold text-ink sm:text-xl">{formatPrice(monthStats.expected)}</p>
          </div>
          <div className="rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              <TrendingUp className="size-3" /> გადახდილი
            </p>
            <p className="mt-1 text-lg font-bold text-win sm:text-xl">{formatPrice(monthStats.paid)}</p>
          </div>
          <div className="rounded-2xl border border-hairline bg-paper px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              <AlertCircle className="size-3" /> დავალიანება
            </p>
            <p className="mt-1 text-lg font-bold text-loss sm:text-xl">{formatPrice(monthStats.debt)}</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col rounded-3xl border border-hairline bg-surface p-3 shadow-sm sm:p-4">
          <div className="grid grid-cols-7 gap-1 pb-2">
            {WEEKDAYS_KA.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-muted">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`b-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayLessons = lessonsMap.get(day) ?? [];
              const isToday = isCurrentMonth && day === todayDate;
              const isSelected = selectedDay === day;
              const hasLessons = dayLessons.length > 0;

              const dayPaid = dayLessons.reduce(
                (sum, { student }) => sum + sumPaymentsForMonth(payments, student.id, monthKey),
                0,
              );
              const dayExpected = dayLessons.reduce(
                (sum, { student }) => sum + student.monthlyPrice, 0,
              );
              const fullPaid = dayExpected > 0 && dayPaid >= dayExpected;
              const partialPaid = dayPaid > 0 && dayPaid < dayExpected;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`group relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border transition ${
                    isSelected
                      ? 'border-navy bg-navy text-white shadow-md'
                      : isToday
                        ? 'border-brass/50 bg-brass-tint/50 hover:border-brass'
                        : hasLessons
                          ? 'border-hairline bg-paper hover:border-navy/40 hover:bg-navy-tint/40'
                          : 'border-transparent hover:border-hairline hover:bg-paper'
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      isSelected ? 'text-white' : isToday ? 'text-brass-strong' : hasLessons ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {day}
                  </span>

                  {hasLessons ? (
                    <span className={`mt-0.5 flex items-center gap-0.5 text-[9px] font-bold ${isSelected ? 'text-white/90' : 'text-navy'}`}>
                      <Clock3 className="size-2.5" />
                      {dayLessons.length}
                    </span>
                  ) : null}

                  {hasLessons ? (
                    <span
                      className={`absolute bottom-1 size-1.5 rounded-full ${
                        fullPaid ? 'bg-win' : partialPaid ? 'bg-brass' : 'bg-loss'
                      }`}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-[10px] font-medium text-muted">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-win" /> სრულად</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-brass" /> ნაწილობრივ</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-loss" /> გადაუხდელი</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-surface shadow-sm">
          <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
            <div>
              <p className="text-xs font-bold text-ink">
                {selectedDay ? `${selectedDay} ${formatMonthLabel(monthKey)}` : 'აირჩიე დღე'}
              </p>
              <p className="text-[11px] font-medium text-muted">
                {selectedDay ? `${selectedLessons.length} გაკვეთილი` : 'დააწკაპუნე დღეს'}
              </p>
            </div>
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-brass-tint text-brass-strong">
              <CalendarDays className="size-4" />
            </span>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            {!selectedDay ? (
              <p className="px-2 py-10 text-center text-xs font-medium text-muted">აირჩიე დღე კალენდარში</p>
            ) : selectedLessons.length === 0 ? (
              <p className="px-2 py-10 text-center text-xs font-medium text-muted">ამ დღეს გაკვეთილი არ არის</p>
            ) : (
              <div className="space-y-2">
                {selectedLessons.map(({ student, startTime, endTime, groupId }, idx) => {
                  const paid = sumPaymentsForMonth(payments, student.id, monthKey);
                  const owed = Math.max(0, student.monthlyPrice - paid);
                  const isPaid = owed === 0;

                  return (
                    <div key={`${student.id}-${idx}`} className="rounded-2xl border border-hairline bg-paper p-3 transition hover:border-navy/30">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectStudent?.(student)}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                        >
                          <p className="truncate text-xs font-bold text-ink">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-medium text-muted">
                            <span className="flex items-center gap-1">
                              <Clock3 className="size-2.5" />
                              {startTime}–{endTime}
                            </span>
                            <span className="text-navy">•</span>
                            <span>{getGroupName(groupId, groups)}</span>
                          </p>
                        </button>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          isPaid
                            ? 'border-win/20 bg-win-tint text-win'
                            : paid > 0
                              ? 'border-brass/30 bg-brass-tint text-brass-strong'
                              : 'border-loss/20 bg-loss-tint text-loss'
                        }`}>
                          {isPaid ? '✓' : paid > 0 ? 'ნაწილ.' : 'ვალი'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-hairline pt-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted">
                          <Wallet className="size-3 text-brass-strong" />
                          <span>უნდა: {formatPrice(student.monthlyPrice)}</span>
                        </div>
                        <EditableAmount
                          value={paid}
                          onSave={(v) => onSetPaid(student.id, monthKey, v)}
                          className={isPaid ? 'text-win hover:bg-win-tint' : 'text-loss hover:bg-loss-tint'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}