'use client';

import { Fragment, useState } from 'react';

import { ChevronDown, Clock3, Phone } from 'lucide-react';

import { DAY_SHORT } from '../studentList.helpers';

import {
  computeExpectedInfo,
  parseMonthKey,
  sumPaymentsForMonth,
} from '../paymentCalendar.helpers';

import type {
  PaymentRecord,
  StudentGroup,
  StudentRecord,
} from '../studentList.types';

import type { StudentListSection } from '../studentList.helpers';

interface Props {
  sections: StudentListSection[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  groupMemberCounts: Record<string, number>;
  onSelect: (student: StudentRecord) => void;
  onEditLessons: (student: StudentRecord) => void;
  onEditPhones: (student: StudentRecord) => void;
  onManagePayments?: (student: StudentRecord) => void;
  onUpdateStudent?: (id: string, patch: Partial<StudentRecord>) => void;
  onEditIndividual?: (student: StudentRecord) => void;
}

export function StudentListTable({
  sections,
  groups,
  payments,
  monthKey,
  groupMemberCounts,
  onSelect,
  onEditLessons,
  onEditPhones,
  onManagePayments,
  onUpdateStudent,
  onEditIndividual,
}: Props) {
  const { year, month } = parseMonthKey(monthKey);

  const [openStudentIds, setOpenStudentIds] = useState<Set<string>>(new Set());

  const [editingPaymentDateId, setEditingPaymentDateId] = useState<
    string | null
  >(null);

  const [paymentDateDraft, setPaymentDateDraft] = useState('');

  const today = new Date().getDay();
  const todayDayOfWeek = today === 0 ? 7 : today;

  const toggleStudent = (studentId: string) => {
    setOpenStudentIds((current) => {
      const next = new Set(current);

      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }

      return next;
    });
  };

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm lg:block">
      <div className="custom-scrollbar overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[52rem] border-collapse text-left">
          <thead className="bg-paper">
            <tr className="border-b border-hairline text-[10px] font-bold uppercase tracking-wider text-muted">
              <th className="px-4 py-3">მოსწავლე</th>
              <th className="px-4 py-3">ფასი / ტიპი</th>
              <th className="px-4 py-3">გადახდის თარიღი</th>
              <th className="px-4 py-3">განრიგი</th>
              <th className="px-4 py-3 text-right">დეტალები</th>
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => (
              <Fragment key={section.key}>
                <tr className="bg-navy-tint/35">
                  <td colSpan={5} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          section.kind === 'group'
                            ? 'bg-navy'
                            : 'bg-brass-strong'
                        }`}
                      />

                      <span className="text-[11px] font-bold tracking-wide text-ink">
                        {section.title}
                      </span>

                      <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold text-muted">
                        {section.students.length}
                      </span>
                    </div>
                  </td>
                </tr>

                {section.students.map((student) => {
                  const info = computeExpectedInfo(student, year, month);
                  const expected = info.amount;
                  const paid = sumPaymentsForMonth(
                    payments,
                    student.id,
                    monthKey,
                  );

                  const status =
                    paid >= expected
                      ? 'paid'
                      : paid > 0
                        ? 'partial'
                        : 'unpaid';

                  const isOpen = openStudentIds.has(student.id);
                  const isIndividual = student.kind === 'individual';

                  const sharedCount = student.groupIds[0]
                    ? groupMemberCounts[student.groupIds[0]]
                    : undefined;

                  const hasSharedGroup =
                    !isIndividual && sharedCount && sharedCount > 1;

                  const initial = student.firstName.charAt(0) || '?';

                  const hasLessonToday = student.lessons.some(
                    (lesson) => lesson.dayOfWeek === todayDayOfWeek,
                  );

                  const detailsColor = isOpen
                    ? 'bg-navy-tint text-navy'
                    : status === 'paid'
                      ? 'text-win hover:bg-win-tint'
                      : status === 'partial'
                        ? 'text-brass-strong hover:bg-brass-tint'
                        : 'text-loss hover:bg-loss-tint';

                  const isEditingPaymentDate =
                    editingPaymentDateId === student.id;

                  return (
                    <Fragment key={student.id}>
                      {/* Main row */}
                      <tr
                        onClick={() => onSelect(student)}
                        className={`cursor-pointer border-b border-hairline transition ${
                          isOpen
                            ? 'bg-navy-tint/20'
                            : 'hover:bg-navy-tint/25'
                        }`}
                      >
                        {/* Student */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                hasLessonToday
                                  ? 'animate-pulse bg-yellow-200 text-yellow-800'
                                  : 'bg-navy-tint text-navy'
                              }`}
                            >
                              {initial}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-ink">
                                {student.firstName} {student.lastName}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onManagePayments?.(student);
                            }}
                            className="cursor-pointer rounded-md px-1.5 py-0.5 text-left transition hover:bg-navy-tint"
                          >
                            <span className="text-sm font-bold tabular-nums text-ink">
                              {student.monthlyPrice > 0
                                ? student.monthlyPrice.toLocaleString('ka-GE')
                                : '—'}
                            </span>

                            <span className="text-muted"> / </span>

                            <span className="text-[10px] font-bold text-ink">
                              {info.unitLabel}
                            </span>
                          </button>
                        </td>

                        {/* Payment date */}
                        <td className="px-4 py-3">
                          {isEditingPaymentDate ? (
                            <input
                              type="date"
                              autoFocus
                              value={paymentDateDraft}
                              onChange={(event) => {
                                setPaymentDateDraft(event.target.value);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              onBlur={(event) => {
                                setEditingPaymentDateId((current) =>
                                  current === student.id ? null : current,
                                );
                                const next = event.target.value.trim();
                                if ((student.paymentDate ?? '') === next) {
                                  return;
                                }
                                onUpdateStudent?.(student.id, {
                                  paymentDate: next,
                                });
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.currentTarget.blur();
                                }
                              }}
                              className="w-full max-w-[9rem] rounded-md border border-hairline bg-surface px-2 py-1 text-xs font-medium tabular-nums text-ink outline-none focus:border-navy"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPaymentDateDraft(student.paymentDate ?? '');
                                setEditingPaymentDateId(student.id);
                              }}
                              className="cursor-pointer rounded-md px-1.5 py-0.5 text-left text-xs font-bold tabular-nums text-ink transition hover:bg-navy-tint"
                            >
                              {student.paymentDate || '—'}
                            </button>
                          )}
                        </td>

                        {/* Schedule */}
                        <td className="px-4 py-3">
                          {student.lessons.length > 0 ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-navy">
                              <div className="flex items-center gap-2 text-[11px] font-medium text-body">
                                {student.lessons.map((lesson, index) => (
                                  <Fragment key={lesson.id}>
                                    <span className="font-bold text-navy">
                                      {DAY_SHORT[lesson.dayOfWeek]}
                                    </span>

                                    {index < student.lessons.length - 1 ? (
                                      <span className="text-muted">/</span>
                                    ) : null}
                                  </Fragment>
                                ))}
                              </div>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted">—</span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleStudent(student.id);
                            }}
                            aria-expanded={isOpen}
                            className={`ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${detailsColor}`}
                          >
                            <ChevronDown
                              className={`size-5 transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </td>
                      </tr>

                      {/* Accordion */}
                      {isOpen ? (
                        <tr className="border-b border-hairline bg-navy-tint/10">
                          <td colSpan={5} className="px-4 py-0">
                            <div className="grid grid-cols-1 gap-5 px-8 py-4 sm:grid-cols-2">
                              {/* Contact */}
                              <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                  <Phone className="size-3.5 text-navy" />

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                                    კონტაქტი
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onEditPhones(student);
                                  }}
                                  className="cursor-pointer rounded-lg px-2 py-1.5 text-left transition hover:bg-navy-tint"
                                >
                                  <p className="text-xs font-bold text-ink">
                                    {student.phone || 'ტელეფონი არ არის'}
                                  </p>

                                  {student.parentPhone ? (
                                    <p className="mt-1 text-[10px] font-medium text-muted">
                                      მშობელი: {student.parentPhone}
                                    </p>
                                  ) : null}

                                  {student.email ? (
                                    <p className="mt-1 truncate text-[10px] font-medium text-muted">
                                      {student.email}
                                    </p>
                                  ) : null}
                                </button>
                              </div>

                              {/* Schedule */}
                              <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                  <Clock3 className="size-3.5 text-navy" />

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                                    სრული განრიგი
                                  </span>
                                </div>

                                {student.lessons.length === 0 ? (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onEditLessons(student);
                                    }}
                                    className="cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted transition hover:bg-navy-tint hover:text-navy"
                                  >
                                    + განრიგის დამატება
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onEditLessons(student);
                                    }}
                                    className="cursor-pointer rounded-lg px-2 py-1.5 text-left transition hover:bg-navy-tint"
                                  >
                                    <div className="space-y-1.5">
                                      {student.lessons.map((lesson) => (
                                        <div
                                          key={lesson.id}
                                          className="flex items-center gap-2 text-[11px] font-medium text-body"
                                        >
                                          <span className="w-8 font-bold text-navy">
                                            {DAY_SHORT[lesson.dayOfWeek]}
                                          </span>

                                          <span className="font-bold text-ink">
                                            {lesson.startTime}
                                          </span>

                                          <span className="text-muted">–</span>

                                          <span>{lesson.endTime}</span>
                                        </div>
                                      ))}

                                      {hasSharedGroup ? (
                                        <p className="pt-1 text-[10px] font-medium text-navy">
                                          საერთო · {sharedCount} მოსწავლე
                                        </p>
                                      ) : null}
                                    </div>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}