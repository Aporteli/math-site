'use client';

import { Fragment, useState } from 'react';

import { getGroupName } from '../studentList.helpers';

import {
  computeExpectedInfo,
  formatDayLabel,
  getMonthKey,
  groupDayLessons,
  isLessonMissed,
  lessonsForDate,
  sumPaymentsForMonth,
  toDateKey,
} from '../paymentCalendar.helpers';

import type { PaymentRecord, StudentGroup, StudentRecord } from '../studentList.types';

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
  onDisbandHomeGroup?: (groupId: string) => void | Promise<void>;
}

export function StudentListTable({ sections, groups, payments, onSelect, onUpdateStudent, onDisbandHomeGroup }: Props) {
  const [editingPaymentDateId, setEditingPaymentDateId] = useState<string | null>(null);

  const [paymentDateDraft, setPaymentDateDraft] = useState('');

  const todayDate = new Date();
  const todayKey = toDateKey(todayDate);
  const todayMonthKey = getMonthKey(todayDate);
  const seenStudentIds = new Set<string>();
  const todayStudents: StudentRecord[] = [];
  for (const section of sections) {
    for (const student of section.students) {
      if (seenStudentIds.has(student.id)) continue;
      seenStudentIds.add(student.id);
      todayStudents.push(student);
    }
  }
  const todayLessons = lessonsForDate(todayStudents, todayDate);
  const todaySessions = groupDayLessons(todayLessons);
  const [hoveringSection, setHoveringSection] = useState<string | null>(null);

  return (
    <div className="flex h-auto flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:flex-row lg:items-stretch">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto thin-scrollbar rounded-box border border-hairline bg-surface shadow-sm">
        <div className="custom-scrollbar overflow-x-auto overscroll-x-contain">
          <table className="w-full border-collapse text-left">
            <thead className="bg-sectionHeader">
              <tr className="border-b border-hairline text-[10px] font-bold uppercase tracking-wider text-muted">
                <th className="px-4 py-3">მოსწავლე</th>
                <th className="px-4 py-3 text-right">გადახდის თარიღი</th>
              </tr>
            </thead>

            <tbody>
              {sections.map((section) => (
                <Fragment key={section.key}>
                  <tr
                    className={`${section.kind === 'home' || section.kind === 'individual' ? 'bg-brass-tint/80' : 'bg-navy/10'}  border-t border-hairline font-bold uppercase tracking-wider text-muted`}
                    onMouseEnter={() => setHoveringSection(section.key)}
                    onMouseLeave={() => setHoveringSection(null)}>
                    <td colSpan={2} className="pr-4 pl-2 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-bold tracking-wide text-ink">{section.title}</span>
                        {section.kind === 'home' && section.groupId && onDisbandHomeGroup ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onDisbandHomeGroup(section.groupId!);
                            }}
                            className={` ml-auto cursor-pointer rounded-box px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted transition hover:bg-sectionHeader hover:text-ink hover:opacity-100 ${hoveringSection === section.key ? 'opacity-15' : 'opacity-0 pointer-events-none'}`}>
                            დაშლა
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>

                  {section.students.map((student) => {
                    const isEditingPaymentDate = editingPaymentDateId === student.id;

                    return (
                      <Fragment key={student.id}>
                        {/* Main row */}
                        <tr
                          onClick={() => onSelect(student)}
                          className="cursor-pointer  transition hover:bg-sectionHeader">
                          {/* Student */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="min-w-0">
                                <p className="truncate rounded-box pl-3 text-sm text-ink">
                                  {student.firstName} {student.lastName}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Payment date */}
                          <td className="px-4 py-3 text-right">
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
                                  setEditingPaymentDateId((current) => (current === student.id ? null : current));
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
                                className="ml-auto block w-full max-w-[9rem] rounded-box border border-hairline bg-searchInput px-2 py-1 text-xs font-medium tabular-nums text-searchInputText outline-none focus:border-navy"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPaymentDateDraft(student.paymentDate ?? '');
                                  setEditingPaymentDateId(student.id);
                                }}
                                className="ml-auto cursor-pointer rounded-box px-1.5 py-0.5 text-xs font-bold tabular-nums text-ink transition hover:bg-sectionHeader">
                                {student.paymentDate || '—'}
                              </button>
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex max-h-[24rem] w-full shrink-0 flex-col overflow-hidden rounded-box border border-hairline bg-paper shadow-sm lg:h-full lg:max-h-none lg:w-[30rem]">
        <div className="flex shrink-0 bg-sectionHeader items-center gap-3 border-b border-hairline px-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-box bg-[#465D73] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            {todayDate.getDate()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink">{formatDayLabel(todayDate)}</p>
            <p className="text-[11px] font-medium text-muted">
              {todaySessions.length} გაკვეთილი
              {todayLessons.length !== todaySessions.length ? ` · ${todayLessons.length} მოსწავლე` : ''}
            </p>
          </div>
        </div>

        <div className="custom-scrollbar bg-main min-h-0 flex-1 overflow-y-auto p-2">
          {todaySessions.length === 0 ? (
            <p className="px-2 py-10 text-center text-xs font-medium text-muted">ამ დღეს გაკვეთილი არ არის</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div key={session.key} className="flex gap-3">
                  <div className="w-12 shrink-0 pt-1 text-right text-[11px] font-bold tabular-nums text-mainText">
                    {session.startTime}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 border-l border-hairline pl-3">
                    <p className=" px-1.5 py-0.5 text-[10px] font-bold text-brass-strong">
                      {session.kind === 'group'
                        ? `${getGroupName(session.groupId, groups)} · ${session.lessons.length} მოსწავლე`
                        : 'სახლში'}
                      <span className="ml-1 font-medium text-mainText">
                        {session.startTime}–{session.endTime}
                      </span>
                    </p>
                    {session.lessons.map((lesson, idx) => {
                      const paid = sumPaymentsForMonth(payments, lesson.student.id, todayMonthKey);
                      const expected = computeExpectedInfo(
                        lesson.student,
                        todayDate.getFullYear(),
                        todayDate.getMonth() + 1,
                      ).amount;
                      const missed =
                        lesson.student.priceType === 'PER_LESSON' &&
                        isLessonMissed(lesson.student, lesson.lessonId, todayKey);
                      const isPaid = expected <= paid;

                      return (
                        <button
                          key={`${lesson.student.id}-${lesson.lessonId}-${idx}`}
                          type="button"
                          onClick={() => onSelect(lesson.student)}
                          className={`block w-full cursor-pointer rounded-box border px-2.5 py-2 text-left ${
                            missed
                              ? 'border-loss/30 bg-loss-tint/40'
                              : isPaid
                                ? 'border-win/20 bg-win-tint/40'
                                : paid > 0
                                  ? 'border-brass/30 bg-brass-tint/40'
                                  : 'border-hairline bg-surface'
                          }`}>
                          <p className={`truncate text-xs font-bold ${missed ? 'text-loss line-through' : 'text-ink'}`}>
                            {lesson.student.firstName} {lesson.student.lastName}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium text-muted">
                            {missed ? 'გამოტოვა' : isPaid ? 'გადახდილია' : paid > 0 ? 'ნაწილობრივ' : 'გადაუხდელი'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
