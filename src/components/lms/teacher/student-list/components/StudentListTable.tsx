'use client';

import { Clock3, Phone, Wallet } from 'lucide-react';
import { EditableAmount } from './EditableAmount';
import { DAY_SHORT, getGroupName, paymentStatus } from '../studentList.helpers';
import { sumPaymentsForMonth } from '../paymentCalendar.helpers';
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
  onSelect: (student: StudentRecord) => void;
  onUpdateStudent: (id: string, patch: Partial<StudentRecord>) => void;
  onSetPaid: (studentId: string, monthKey: string, amount: number) => void;
  onEditLessons: (student: StudentRecord) => void;
  onEditPhones: (student: StudentRecord) => void;
}

export function StudentListTable({
  students,
  groups,
  payments,
  monthKey,
  onSelect,
  onUpdateStudent,
  onSetPaid,
  onEditLessons,
  onEditPhones,
}: Props) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm lg:block">
      <div className="custom-scrollbar overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[52rem] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-paper">
            <tr className="border-b border-hairline text-[11px] font-bold tracking-wide text-muted">
              <th className="px-4 py-3 font-bold">მოსწავლე</th>
              <th className="px-4 py-3 font-bold">ტელეფონი</th>
              <th className="px-4 py-3 font-bold">ჯგუფები</th>
              <th className="px-4 py-3 font-bold">თვის ფასი / გადახდილი</th>
              <th className="px-4 py-3 font-bold">გაკვეთილის დრო</th>
              <th className="whitespace-nowrap px-4 py-3 font-bold">სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const paid = sumPaymentsForMonth(payments, student.id, monthKey);
              const status = paymentStatus({ ...student, paidAmount: paid });
              const badge = {
                paid: { label: 'გადახდილია', cls: 'border-win/20 bg-win-tint text-win' },
                partial: { label: 'ნაწილობრივ', cls: 'border-brass/30 bg-brass-tint text-brass-strong' },
                unpaid: { label: 'გადაუხდელი', cls: 'border-loss/20 bg-loss-tint text-loss' },
              }[status];
              const initial = student.firstName.charAt(0) || '?';

              return (
                <tr
                  key={student.id}
                  onClick={() => onSelect(student)}
                  className="cursor-pointer border-b border-hairline last:border-b-0 transition hover:bg-paper/70"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-tint text-xs font-bold text-navy">
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">
                          {student.firstName} {student.lastName}
                        </p>
                        {student.email ? (
                          <p className="truncate text-[11px] font-medium text-muted">
                            {student.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* ⬇️ ტელეფონის სვეტი — clickable, editor-ით */}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPhones(student);
                      }}
                      title="ტელეფონის რედაქტირება"
                      className="group/phone inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition hover:bg-navy-tint"
                    >
                      <Phone className="h-3 w-3 shrink-0 text-muted transition group-hover/phone:text-navy" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink">
                          {student.phone || '—'}
                        </p>
                        {student.parentPhone ? (
                          <p className="truncate text-[10px] font-medium text-muted">
                            მშობელი: {student.parentPhone}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {student.groupIds.length === 0 ? (
                        <span className="text-[11px] text-muted">—</span>
                      ) : (
                        student.groupIds.map((gid) => (
                          <span
                            key={gid}
                            className="rounded-full border border-hairline bg-paper px-2 py-0.5 text-[10px] font-bold text-body"
                          >
                            {getGroupName(gid, groups)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-3 w-3 shrink-0 text-brass-strong" />
                        <span className="text-[10px] font-medium text-muted">ფასი:</span>
                        <EditableAmount
                          value={student.monthlyPrice}
                          onSave={(v) =>
                            onUpdateStudent(student.id, { monthlyPrice: v })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pl-4.5">
                        <span className="text-[10px] font-medium text-muted">გადახდა:</span>
                        <EditableAmount
                          value={paid}
                          onSave={(v) => onSetPaid(student.id, monthKey, v)}
                          className="text-win hover:bg-win-tint"
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLessons(student);
                      }}
                      title="გაკვეთილის დროების რედაქტირება"
                      className="flex w-full cursor-pointer items-start gap-2 rounded-lg p-1.5 text-left transition hover:bg-navy-tint"
                    >
                      <div className="min-w-0 flex-1">
                        {student.lessons.length === 0 ? (
                          <span className="text-[11px] text-muted">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {student.lessons.slice(0, 2).map((l) => (
                              <p
                                key={l.id}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-body"
                              >
                                <Clock3 className="h-3 w-3 text-navy" />
                                <span className="font-bold text-ink">
                                  {DAY_SHORT[l.dayOfWeek]}
                                </span>
                                <span>
                                  {l.startTime}–{l.endTime}
                                </span>
                              </p>
                            ))}
                            {student.lessons.length > 2 ? (
                              <p className="pl-4.5 text-[10px] font-medium text-muted">
                                +{student.lessons.length - 2} კიდევ
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}