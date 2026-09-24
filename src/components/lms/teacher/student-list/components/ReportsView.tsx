'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3, TrendingUp, Wallet, Users, ChevronLeft, ChevronRight,
  Banknote, CreditCard, ArrowLeftRight, Calendar as CalendarIcon,
  Award, List,
} from 'lucide-react';
import {
  MONTH_NAMES_KA,
  shiftMonth, parseMonthKey, formatMonthLabel,
  sumPaymentsForMonth,
} from '../paymentCalendar.helpers';
import { formatPrice } from '../studentList.helpers';
import type {
  PaymentRecord,
  StudentGroup,
  StudentRecord,
} from '../studentList.types';

interface Props {
  students: StudentRecord[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  onMonthChange: (key: string) => void;
}

type Mode = 'monthly' | 'yearly';

/* ─── ჩარტის ზომები ─── */
const CHART_HEIGHT = 180;      /* bars area in px */
const Y_AXIS_WIDTH = 52;       /* px — Y labels area */

const METHOD_LABEL = {
  cash: 'ნაღდი',
  card: 'ბარათი',
  transfer: 'გადარიცხვა',
} as const;

const METHOD_ICON = {
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowLeftRight,
} as const;

const METHOD_COLOR = {
  cash: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  card: 'text-sky-600 bg-sky-50 border-sky-200',
  transfer: 'text-violet-600 bg-violet-50 border-violet-200',
} as const;

/* ═══════════════════════════════════════════════════════════
   Helpers — ლამაზი Y-ღერძის მნიშვნელობები
   ═══════════════════════════════════════════════════════════ */

/**
 * აბრუნებს "ლამაზ" max-ს (მრგვალი რიცხვი) და 4-5 tick-ს.
 * მაგ: 137 → max: 150, ticks: [0, 50, 100, 150]
 */
function getNiceScale(maxValue: number): { max: number; ticks: number[] } {
  if (maxValue <= 0) {
    return { max: 100, ticks: [0, 25, 50, 75, 100] };
  }

  const TARGET_TICKS = 4;
  const rawStep = maxValue / TARGET_TICKS;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;

  let step: number;
  if (norm <= 1) step = 1 * mag;
  else if (norm <= 2) step = 2 * mag;
  else if (norm <= 2.5) step = 2.5 * mag;
  else if (norm <= 5) step = 5 * mag;
  else step = 10 * mag;

  const niceMax = Math.ceil(maxValue / step) * step;
  const tickCount = Math.round(niceMax / step);

  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(i * step);
  }

  return { max: niceMax, ticks };
}

/** კომპაქტური რიცხვის ფორმატი: 150, 1.2k, 15k */
function formatCompactCurrency(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000) {
    const k = value / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k ₾`;
  }
  return `${Math.round(value)} ₾`;
}

/* ═══════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════ */

export function ReportsView({
  students,
  groups,
  payments,
  monthKey,
  onMonthChange,
}: Props) {
  const [mode, setMode] = useState<Mode>('monthly');
  const { year, month } = parseMonthKey(monthKey);

  /* ─── MONTHLY ─── */
  const monthlyData = useMemo(() => {
    const monthPayments = payments.filter((p) => p.monthKey === monthKey);

    const totalPaid = monthPayments.reduce((s, p) => s + p.amount, 0);
    const paymentCount = monthPayments.length;

    const byMethod = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
    };

    monthPayments.forEach((p) => {
      const m = p.method ?? 'cash';
      if (byMethod[m]) {
        byMethod[m].count += 1;
        byMethod[m].amount += p.amount;
      }
    });

    const byStudent = students
      .map((s) => {
        const paid = sumPaymentsForMonth(payments, s.id, monthKey);
        const monthCount = monthPayments.filter(
          (p) => p.studentId === s.id,
        ).length;
        return { student: s, paid, count: monthCount };
      })
      .filter((r) => r.paid > 0)
      .sort((a, b) => b.paid - a.paid);

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyIncome = Array.from({ length: daysInMonth }, () => 0);
    monthPayments.forEach((p) => {
      const d = new Date(p.paidAt).getDate();
      if (d >= 1 && d <= daysInMonth) {
        dailyIncome[d - 1] += p.amount;
      }
    });
    const maxDaily = Math.max(0, ...dailyIncome);

    return {
      totalPaid,
      paymentCount,
      byMethod,
      byStudent,
      dailyIncome,
      maxDaily,
      daysInMonth,
    };
  }, [payments, students, monthKey, year, month]);

  /* ─── YEARLY ─── */
  const yearlyData = useMemo(() => {
    const monthStats = MONTH_NAMES_KA.map((label, idx) => {
      const mk = `${year}-${String(idx + 1).padStart(2, '0')}`;
      const monthPayments = payments.filter((p) => p.monthKey === mk);
      const total = monthPayments.reduce((s, p) => s + p.amount, 0);
      const count = monthPayments.length;
      return { label, monthIndex: idx + 1, monthKey: mk, total, count };
    });

    const yearTotal = monthStats.reduce((s, m) => s + m.total, 0);
    const yearCount = monthStats.reduce((s, m) => s + m.count, 0);
    const maxMonth = Math.max(0, ...monthStats.map((m) => m.total));
    const avgMonth = yearTotal / 12;

    const best = [...monthStats].sort((a, b) => b.total - a.total)[0];

    const yearPayments = payments.filter((p) =>
      p.monthKey.startsWith(`${year}-`),
    );
    const byMethod = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
    };
    yearPayments.forEach((p) => {
      const m = p.method ?? 'cash';
      if (byMethod[m]) {
        byMethod[m].count += 1;
        byMethod[m].amount += p.amount;
      }
    });

    const byStudent = students
      .map((s) => {
        const paid = yearPayments
          .filter((p) => p.studentId === s.id)
          .reduce((sum, p) => sum + p.amount, 0);
        return { student: s, paid };
      })
      .filter((r) => r.paid > 0)
      .sort((a, b) => b.paid - a.paid);

    return {
      monthStats,
      yearTotal,
      yearCount,
      maxMonth,
      avgMonth,
      best,
      byMethod,
      byStudent,
    };
  }, [payments, students, year]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      {/* ═══ Header ═══ */}
      <div className="rounded-2xl border border-hairline bg-surface p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-navy-tint text-navy">
              <BarChart3 className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink sm:text-lg">
                ანგარიში
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-hairline bg-paper p-1">
              <button
                type="button"
                onClick={() => setMode('monthly')}
                className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                  mode === 'monthly'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-body hover:bg-surface hover:text-ink'
                }`}
              >
                <CalendarIcon className="size-3.5" />
                თვიური
              </button>
              <button
                type="button"
                onClick={() => setMode('yearly')}
                className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                  mode === 'yearly'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-body hover:bg-surface hover:text-ink'
                }`}
              >
                <TrendingUp className="size-3.5" />
                წლიური
              </button>
            </div>

            {mode === 'monthly' && (
              <div className="flex items-center gap-1 rounded-full border border-hairline bg-paper p-1">
                <button
                  type="button"
                  onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
                  aria-label="წინა თვე"
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-32 truncate px-2 text-center text-sm font-bold text-ink">
                  {formatMonthLabel(monthKey)}
                </span>
                <button
                  type="button"
                  onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
                  aria-label="შემდეგი თვე"
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}

            {mode === 'yearly' && (
              <div className="flex items-center gap-1 rounded-full border border-hairline bg-paper p-1">
                <button
                  type="button"
                  onClick={() =>
                    onMonthChange(`${year - 1}-${String(month).padStart(2, '0')}`)
                  }
                  aria-label="წინა წელი"
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-24 truncate px-2 text-center text-sm font-bold text-ink">
                  {year}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onMonthChange(`${year + 1}-${String(month).padStart(2, '0')}`)
                  }
                  aria-label="შემდეგი წელი"
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Big stats ═══ */}
        <div className="mt-4 grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-hairline bg-win-tint/50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-win">
              <Wallet className="size-3.5 shrink-0" />
              {mode === 'monthly' ? 'ამ თვის შემოსავალი' : 'ამ წლის შემოსავალი'}
            </p>
            <p className="mt-1.5 truncate text-2xl font-black tabular-nums text-win sm:text-3xl">
              {formatPrice(mode === 'monthly' ? monthlyData.totalPaid : yearlyData.yearTotal)}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted">
              <List className="size-3.5 shrink-0" /> გადახდების რაოდენობა
            </p>
            <p className="mt-1.5 truncate text-2xl font-black tabular-nums text-ink sm:text-3xl">
              {mode === 'monthly' ? monthlyData.paymentCount : yearlyData.yearCount}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted">
              <Award className="size-3.5 shrink-0" />
              {mode === 'monthly' ? 'საშუალო გადახდა' : 'თვის საშუალო'}
            </p>
            <p className="mt-1.5 truncate text-2xl font-black tabular-nums text-ink sm:text-3xl">
              {formatPrice(
                mode === 'monthly'
                  ? monthlyData.paymentCount > 0
                    ? monthlyData.totalPaid / monthlyData.paymentCount
                    : 0
                  : yearlyData.avgMonth,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
        {mode === 'monthly' ? (
          <MonthlyReport data={monthlyData} monthKey={monthKey} />
        ) : (
          <YearlyReport data={yearlyData} year={year} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MONTHLY REPORT
   ═══════════════════════════════════════════════════════════ */
interface MonthlyData {
  totalPaid: number;
  paymentCount: number;
  byMethod: Record<'cash' | 'card' | 'transfer', { count: number; amount: number }>;
  byStudent: { student: StudentRecord; paid: number; count: number }[];
  dailyIncome: number[];
  maxDaily: number;
  daysInMonth: number;
}

function MonthlyReport({
  data,
  monthKey,
}: {
  data: MonthlyData;
  monthKey: string;
}) {
  const { year, month } = parseMonthKey(monthKey);

  /* Nice scale for Y axis */
  const { max: scaleMax, ticks } = getNiceScale(data.maxDaily);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ─── Daily chart ─── */}
      <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-brass-strong" />
            <p className="text-sm font-bold text-ink">დღიური შემოსავალი</p>
          </div>
          <div className="text-[10px] font-medium text-muted">
            max: {formatCompactCurrency(data.maxDaily)}
          </div>
        </div>

        <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-2">
          {/* Y-axis */}
          <div
            className="relative shrink-0"
            style={{ height: CHART_HEIGHT, width: Y_AXIS_WIDTH }}
          >
            {ticks.map((tick) => {
              const pct = scaleMax > 0 ? (tick / scaleMax) * 100 : 0;
              return (
                <span
                  key={tick}
                  className="absolute right-1 -translate-y-1/2 text-[9px] font-bold tabular-nums text-muted"
                  style={{ top: `${100 - pct}%` }}
                >
                  {formatCompactCurrency(tick)}
                </span>
              );
            })}
          </div>

          {/* Chart area */}
          <div className="relative min-w-0 flex-1">
            {/* Gridlines */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ height: CHART_HEIGHT }}
            >
              {ticks.map((tick) => {
                const pct = scaleMax > 0 ? (tick / scaleMax) * 100 : 0;
                const isTop = tick === scaleMax;
                const isBottom = tick === 0;
                return (
                  <div
                    key={tick}
                    className={`absolute left-0 right-0 border-t ${
                      isBottom
                        ? 'border-hairline'
                        : isTop
                          ? 'border-hairline'
                          : 'border-hairline/40 border-dashed'
                    }`}
                    style={{ top: `${100 - pct}%` }}
                  />
                );
              })}
            </div>

            {/* Bars */}
            <div
              className="relative flex items-end gap-1"
              style={{ height: CHART_HEIGHT }}
            >
              {data.dailyIncome.map((amt, idx) => {
                const day = idx + 1;
                const jsDay = new Date(year, month - 1, day).getDay();
                const isWeekend = jsDay === 0 || jsDay === 6;

                const ratio = scaleMax > 0 ? amt / scaleMax : 0;
                const heightPx = Math.max(amt > 0 ? 6 : 2, ratio * CHART_HEIGHT);

                return (
                  <div
                    key={day}
                    className="group relative flex min-w-[16px] flex-1 flex-col items-center"
                  >
                    {amt > 0 && (
                      <span className="absolute -top-6 z-20 whitespace-nowrap rounded bg-navy px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                        {formatPrice(amt)}
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t transition-all ${
                        amt > 0
                          ? isWeekend
                            ? 'bg-brass hover:bg-brass-strong'
                            : 'bg-win hover:bg-emerald-600'
                          : 'bg-paper-deep'
                      }`}
                      style={{ height: `${heightPx}px` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex gap-1 pt-1">
              {data.dailyIncome.map((_, idx) => {
                const day = idx + 1;
                const jsDay = new Date(year, month - 1, day).getDay();
                const isWeekend = jsDay === 0 || jsDay === 6;
                return (
                  <div
                    key={day}
                    className={`min-w-[16px] flex-1 text-center text-[9px] font-bold tabular-nums ${
                      isWeekend ? 'text-brass-strong' : 'text-muted'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-hairline pt-2 text-[10px] font-medium text-muted">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-win" /> სამუშაო დღე
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-brass" /> შაბათ-კვირა
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-paper-deep" /> გადახდის გარეშე
          </span>
        </div>
      </div>

      {/* ─── Method breakdown ─── */}
      <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="size-4 text-brass-strong" />
          <p className="text-sm font-bold text-ink">გადახდის მეთოდები</p>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
          {(Object.keys(METHOD_LABEL) as (keyof typeof METHOD_LABEL)[]).map((m) => {
            const Icon = METHOD_ICON[m];
            const info = data.byMethod[m];
            const pct =
              data.totalPaid > 0 ? (info.amount / data.totalPaid) * 100 : 0;
            return (
              <div
                key={m}
                className={`rounded-2xl border px-3 py-3 ${METHOD_COLOR[m]}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="text-[11px] font-bold">{METHOD_LABEL[m]}</span>
                </div>
                <p className="mt-1.5 truncate text-lg font-black tabular-nums">
                  {formatPrice(info.amount)}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium opacity-80">
                  <span>{info.count} ოპერაცია</span>
                  {data.totalPaid > 0 && (
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

      {/* ─── Per-student breakdown ─── */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-sm sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <Users className="size-4 text-brass-strong" />
          <p className="text-sm font-bold text-ink">
            ვინ გადაიხადა ({data.byStudent.length})
          </p>
        </div>

        {data.byStudent.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs font-medium text-muted">
            ამ თვეში ჯერ არავის გადაუხდია
          </p>
        ) : (
          <div className="divide-y divide-hairline">
            {data.byStudent.map(({ student, paid, count }, idx) => {
              const pct =
                data.totalPaid > 0 ? (paid / data.totalPaid) * 100 : 0;
              const isIndividual = student.kind === 'individual';
              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      idx === 0
                        ? 'bg-brass text-white'
                        : idx === 1
                          ? 'bg-brass/60 text-white'
                          : idx === 2
                            ? 'bg-brass/40 text-brass-strong'
                            : 'bg-paper-deep text-muted'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="min-w-0 truncate text-sm font-bold text-ink">
                        {student.firstName} {student.lastName}
                      </p>
                  
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="relative h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-paper-deep">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-win"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-muted">
                        {count} ოპერაცია
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black tabular-nums text-win sm:text-base">
                      {formatPrice(paid)}
                    </p>
                    <p className="text-[10px] font-medium tabular-nums text-muted">
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   YEARLY REPORT
   ═══════════════════════════════════════════════════════════ */
interface YearlyData {
  monthStats: {
    label: string;
    monthIndex: number;
    monthKey: string;
    total: number;
    count: number;
  }[];
  yearTotal: number;
  yearCount: number;
  maxMonth: number;
  avgMonth: number;
  best: {
    label: string;
    monthIndex: number;
    monthKey: string;
    total: number;
    count: number;
  };
  byMethod: Record<'cash' | 'card' | 'transfer', { count: number; amount: number }>;
  byStudent: { student: StudentRecord; paid: number }[];
}

function YearlyReport({ data, year }: { data: YearlyData; year: number }) {
  const currentMonth = new Date().getMonth() + 1;

  /* Nice scale for Y axis */
  const { max: scaleMax, ticks } = getNiceScale(data.maxMonth);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ─── 12-month chart ─── */}
      <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-brass-strong" />
            <p className="text-sm font-bold text-ink">{year} წლის შემოსავალი</p>
          </div>
          {data.best.total > 0 && (
            <div className="rounded-full border border-brass/30 bg-brass-tint px-2.5 py-1 text-[10px] font-bold text-brass-strong">
              საუკეთესო: {data.best.label} ({formatPrice(data.best.total)})
            </div>
          )}
        </div>

        <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-2">
          {/* Y-axis */}
          <div
            className="relative shrink-0"
            style={{ height: CHART_HEIGHT, width: Y_AXIS_WIDTH }}
          >
            {ticks.map((tick) => {
              const pct = scaleMax > 0 ? (tick / scaleMax) * 100 : 0;
              return (
                <span
                  key={tick}
                  className="absolute right-1 -translate-y-1/2 text-[9px] font-bold tabular-nums text-muted"
                  style={{ top: `${100 - pct}%` }}
                >
                  {formatCompactCurrency(tick)}
                </span>
              );
            })}
          </div>

          {/* Chart area */}
          <div className="relative min-w-0 flex-1">
            {/* Gridlines */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ height: CHART_HEIGHT }}
            >
              {ticks.map((tick) => {
                const pct = scaleMax > 0 ? (tick / scaleMax) * 100 : 0;
                const isTop = tick === scaleMax;
                const isBottom = tick === 0;
                return (
                  <div
                    key={tick}
                    className={`absolute left-0 right-0 border-t ${
                      isBottom
                        ? 'border-hairline'
                        : isTop
                          ? 'border-hairline'
                          : 'border-hairline/40 border-dashed'
                    }`}
                    style={{ top: `${100 - pct}%` }}
                  />
                );
              })}
            </div>

            {/* Bars */}
            <div
              className="relative flex items-end gap-1.5"
              style={{ height: CHART_HEIGHT }}
            >
              {data.monthStats.map((m) => {
                const isCurrent = m.monthIndex === currentMonth;
                const isEmpty = m.total === 0;

                const ratio = scaleMax > 0 ? m.total / scaleMax : 0;
                const heightPx = Math.max(isEmpty ? 2 : 8, ratio * CHART_HEIGHT);

                return (
                  <div
                    key={m.monthKey}
                    className="group relative flex min-w-[28px] flex-1 flex-col items-center"
                  >
                    {m.total > 0 && (
                      <span className="absolute -top-6 z-20 whitespace-nowrap rounded bg-navy px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                        {formatPrice(m.total)}
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isEmpty
                          ? 'bg-paper-deep'
                          : isCurrent
                            ? 'bg-brass hover:bg-brass-strong'
                            : 'bg-win hover:bg-emerald-600'
                      }`}
                      style={{ height: `${heightPx}px` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex gap-1.5 pt-1">
              {data.monthStats.map((m) => {
                const isCurrent = m.monthIndex === currentMonth;
                return (
                  <div
                    key={m.monthKey}
                    className={`min-w-[28px] flex-1 text-center text-[9px] font-bold sm:text-[10px] ${
                      isCurrent ? 'text-brass-strong' : 'text-muted'
                    }`}
                  >
                    {m.label.slice(0, 3)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-hairline pt-2 text-[10px] font-medium text-muted">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-win" /> თვე
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-brass" /> მიმდინარე თვე
          </span>
        </div>
      </div>

      {/* ─── Monthly table ─── */}
      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <CalendarIcon className="size-4 text-brass-strong" />
          <p className="text-sm font-bold text-ink">თვეების დეტალები</p>
        </div>

        <div className="divide-y divide-hairline">
          {data.monthStats.map((m) => {
            const isCurrent = m.monthIndex === currentMonth;
            const pct =
              data.yearTotal > 0 ? (m.total / data.yearTotal) * 100 : 0;
            return (
              <div
                key={m.monthKey}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  isCurrent ? 'bg-brass-tint/40' : ''
                }`}
              >
                <span
                  className={`w-20 shrink-0 text-xs font-bold ${
                    isCurrent ? 'text-brass-strong' : 'text-ink'
                  }`}
                >
                  {m.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-paper-deep">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${
                        isCurrent ? 'bg-brass' : 'bg-win'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-14 shrink-0 text-right text-[10px] font-bold tabular-nums text-muted">
                  {m.count} ოპ.
                </span>
                <span
                  className={`w-24 shrink-0 text-right text-sm font-black tabular-nums ${
                    m.total > 0 ? 'text-win' : 'text-muted'
                  }`}
                >
                  {m.total > 0 ? formatPrice(m.total) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Method breakdown ─── */}
      <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="size-4 text-brass-strong" />
          <p className="text-sm font-bold text-ink">გადახდის მეთოდები (წელი)</p>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
          {(Object.keys(METHOD_LABEL) as (keyof typeof METHOD_LABEL)[]).map((m) => {
            const Icon = METHOD_ICON[m];
            const info = data.byMethod[m];
            const pct =
              data.yearTotal > 0 ? (info.amount / data.yearTotal) * 100 : 0;
            return (
              <div
                key={m}
                className={`rounded-2xl border px-3 py-3 ${METHOD_COLOR[m]}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="text-[11px] font-bold">{METHOD_LABEL[m]}</span>
                </div>
                <p className="mt-1.5 truncate text-lg font-black tabular-nums">
                  {formatPrice(info.amount)}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium opacity-80">
                  <span>{info.count} ოპერაცია</span>
                  {data.yearTotal > 0 && (
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

      {/* ─── Top students of the year ─── */}
      <div className="rounded-2xl border border-hairline bg-surface shadow-sm sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <p className="text-sm font-bold text-ink">
             მოსწავლეები ({data.byStudent.length})
          </p>
        </div>

        {data.byStudent.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs font-medium text-muted">
            ამ წელს ჯერ არავის გადაუხდია
          </p>
        ) : (
          <div className="divide-y divide-hairline">
            {data.byStudent.slice(0, 10).map(({ student, paid }, idx) => {
              const pct =
                data.yearTotal > 0 ? (paid / data.yearTotal) * 100 : 0;
              const isIndividual = student.kind === 'individual';
              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      idx === 0
                        ? 'bg-brass text-white'
                        : idx === 1
                          ? 'bg-brass/60 text-white'
                          : idx === 2
                            ? 'bg-brass/40 text-brass-strong'
                            : 'bg-paper-deep text-muted'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="min-w-0 truncate text-sm font-bold text-ink">
                        {student.firstName} {student.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black tabular-nums text-win sm:text-base">
                      {formatPrice(paid)}
                    </p>
                    <p className="text-[10px] font-medium tabular-nums text-muted">
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}