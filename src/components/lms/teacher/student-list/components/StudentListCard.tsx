'use client';

import { Clock3, Phone, Wallet, User2, Pencil } from 'lucide-react';
import { EditableAmount } from './EditableAmount';
import {
  getGroupName,
  getTodayLessons,
  paymentStatus,
  DAY_SHORT,
} from '../studentList.helpers';
import { sumPaymentsForMonth } from '../paymentCalendar.helpers';
import type {
  PaymentRecord,
  StudentGroup,
  StudentRecord,
} from '../studentList.types';

interface Props {
  view: 'grid' | 'table';
  student: StudentRecord;
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  onSelect: (student: StudentRecord) => void;
  onUpdateStudent: (id: string, patch: Partial<StudentRecord>) => void;
  onSetPaid: (studentId: string, monthKey: string, amount: number) => void;
  onEditLessons: (student: StudentRecord) => void;
  onEditPhones: (student: StudentRecord) => void;
}

export function StudentListCard({
  view,
  student,
  groups,
  payments,
  monthKey,
  onSelect,
  onUpdateStudent,
  onSetPaid,
  onEditLessons,
  onEditPhones,
}: Props) {
  const paid = sumPaymentsForMonth(payments, student.id, monthKey);
  const status = paymentStatus({ ...student, paidAmount: paid });
  const todayLessons = getTodayLessons(student.lessons);
  const initial = student.firstName.charAt(0) || '?';
  const owed = Math.max(0, student.monthlyPrice - paid);

  const badge = {
    paid: { label: 'გადახდილია', cls: 'border-win/20 bg-win-tint text-win' },
    partial: { label: 'ნაწილობრივ', cls: 'border-brass/30 bg-brass-tint text-brass-strong' },
    unpaid: { label: 'გადაუხდელი', cls: 'border-loss/20 bg-loss-tint text-loss' },
  }[status];

  return (
    <div
      onClick={() => onSelect(student)}
      className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-hairline bg-surface text-left shadow-sm transition hover:border-navy/30 hover:shadow-md sm:hover:-translate-y-0.5 ${
        view === 'grid' ? 'h-full' : ''
      }`}
    >
      <div className="flex items-start gap-3 p-3.5 pb-3 sm:p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-tint text-base font-bold text-navy">
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-bold leading-tight text-ink">
              {student.firstName} {student.lastName}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditPhones(student);
            }}
            title="ტელეფონის რედაქტირება"
            className="mt-1 inline-flex max-w-full cursor-pointer items-center gap-1 rounded-lg px-1 py-1 text-[11px] font-medium text-muted transition hover:bg-navy-tint hover:text-navy"
          >
            <Phone className="size-3 shrink-0" />
            <span className="truncate">
              {student.phone || 'ტელეფონი არ არის'}
            </span>
          </button>

          {student.parentPhone ? (
            <p className="mt-0.5 flex items-center gap-1 pl-1 text-[10px] font-medium text-muted">
              <User2 className="size-3 shrink-0" />
              <span className="truncate">მშობელი: {student.parentPhone}</span>
            </p>
          ) : null}
        </div>
      </div>

      {/* ─── Groups ─── */}
      {student.groupIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {student.groupIds.map((gid) => (
            <span
              key={gid}
              className="rounded-full border border-hairline bg-paper px-2 py-0.5 text-[10px] font-bold text-body"
            >
              {getGroupName(gid, groups)}
            </span>
          ))}
        </div>
      ) : (
        <div className="px-4 pb-3">
          <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
            ჯგუფის გარეშე
          </span>
        </div>
      )}

      {/* ─── Payment ─── */}
      <div className="border-t border-hairline bg-paper/50 px-4 py-3">
        {/* <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted">
          <Wallet className="h-3 w-3" /> გადახდა
        </p> */}

        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-xl bg-surface/70 px-2 py-1.5">
            <p className="text-[10px] font-medium text-muted">ფასი</p>
            <div className="mt-0.5">
              <EditableAmount
                value={student.monthlyPrice}
                onSave={(v) => onUpdateStudent(student.id, { monthlyPrice: v })}
              />
            </div>
          </div>

          <div className="min-w-0 rounded-xl bg-surface/70 px-2 py-1.5 text-right">
            <p className="text-[10px] font-medium text-muted">გადახდა</p>
            <div className="mt-0.5 flex justify-end">
              <EditableAmount
                value={paid}
                onSave={(v) => onSetPaid(student.id, monthKey, v)}
                className={status === 'paid' ? 'text-win hover:bg-win-tint' : 'text-ink'}
              />
            </div>
          </div>
        </div>

        {owed > 0 ? (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-loss-tint px-2 py-1">
            <span className="text-[10px] font-bold text-loss">დარჩენილი</span>
            <span className="text-[11px] font-bold text-loss">{owed} ₾</span>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-win-tint px-2 py-1">
            <span className="text-[10px] font-bold text-win">სრულად გადახდილია</span>
            <span className="text-[11px] font-bold text-win">✓</span>
          </div>
        )}
      </div>

      {/* ─── Schedule ─── */}
      <div className="border-t border-hairline px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted">
            <Clock3 className="h-3 w-3" /> გაკვეთილები
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditLessons(student);
            }}
            title="გაკვეთილის დროების რედაქტირება"
            className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 py-1 text-[10px] font-bold text-navy transition hover:border-navy/40 hover:bg-navy-tint"
          >
            <Pencil className="h-2.5 w-2.5" />
            <span>რედაქტირება</span>
          </button>
        </div>

        {student.lessons.length === 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditLessons(student);
            }}
            className="w-full cursor-pointer rounded-lg border border-dashed border-hairline bg-paper px-3 py-2 text-center text-[11px] font-bold text-muted transition hover:border-navy/40 hover:bg-navy-tint hover:text-navy"
          >
            + გაკვეთილის დამატება
          </button>
        ) : (
          <div className="space-y-1">
            {student.lessons.slice(0, 3).map((l) => {
              const isToday = todayLessons.some((tl) => tl.id === l.id);
              return (
                <div
                  key={l.id}
                  className={`flex items-center justify-between rounded-lg px-2 py-1 text-[11px] ${
                    isToday ? 'bg-navy-tint font-bold text-navy' : 'text-body'
                  }`}
                >
                  <span className="font-bold">{DAY_SHORT[l.dayOfWeek]}</span>
                  <span>
                    {l.startTime}–{l.endTime}
                  </span>
                </div>
              );
            })}

            {student.lessons.length > 3 ? (
              <p className="px-2 pt-0.5 text-[10px] font-medium text-muted">
                +{student.lessons.length - 3} კიდევ
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-paper/40 px-4 py-2.5 text-[10px] font-medium text-muted">
        <span className="flex items-center gap-1">
          <User2 className="h-3 w-3" />
          {student.status === 'active'
            ? 'აქტიური'
            : student.status === 'paused'
              ? 'შეჩერებული'
              : 'დასრულებული'}
        </span>
        {todayLessons.length > 0 ? (
          <span className="flex items-center gap-1 font-bold text-navy">
            <Clock3 className="h-3 w-3" />
            დღეს {todayLessons.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}