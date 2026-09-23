'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users,
  Wallet,
  CalendarClock,
  Filter,
  CalendarDays,
  Table2 as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { StudentListCard } from './StudentListCard';
import { StudentListTable } from './StudentListTable';
import { PaymentCalendar } from './PaymentCalendar';
import { LessonEditorModal } from './LessonEditorModal';
import { PhoneEditorModal } from './PhoneEditorModal';
import { formatPrice, getTodayLessons } from '../studentList.helpers';
import { getMonthKey, sumPaymentsForMonth } from '../paymentCalendar.helpers';
import {
  addLessonSlotAction,
  deleteLessonSlotAction,
} from '@/lib/teacher/actions';
import type {
  PaymentRecord,
  StudentGroup,
  StudentRecord,
} from '../studentList.types';

interface Props {
  students: StudentRecord[];
  groups: StudentGroup[];
  initialPayments?: PaymentRecord[];
  onSelectStudent?: (student: StudentRecord) => void;
  onUpdateStudent?: (id: string, patch: Partial<StudentRecord>) => void;
  onUpdatePayments?: (payments: PaymentRecord[]) => void;
  onUpdatePhones?: (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
  ) => Promise<{ ok: boolean; error?: string }>;
}

type View = 'table' | 'grid' | 'calendar';

export function StudentList({
  students,
  groups,
  initialPayments = [],
  onSelectStudent,
  onUpdateStudent,
  onUpdatePayments,
  onUpdatePhones,
}: Props) {
  const [view, setView] = useState<View>('table');
  const [query, setQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | 'all'>('all');
  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));

  const [localStudents, setLocalStudents] = useState(students);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);

  // გაკვეთილების რედაქტორის state
  const [lessonEditorStudent, setLessonEditorStudent] =
    useState<StudentRecord | null>(null);

  // ⬇️ ტელეფონის რედაქტორის state
  const [phoneEditorStudent, setPhoneEditorStudent] =
    useState<StudentRecord | null>(null);

  useEffect(() => setLocalStudents(students), [students]);
  useEffect(() => setPayments(initialPayments), [initialPayments]);

  /* ════════════ Handlers ════════════ */

  const handleUpdateStudent = (id: string, patch: Partial<StudentRecord>) => {
    setLocalStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
    onUpdateStudent?.(id, patch);
  };

  const handleSetPaid = (studentId: string, mk: string, amount: number) => {
    setPayments((prev) => {
      const withoutThis = prev.filter(
        (p) => !(p.studentId === studentId && p.monthKey === mk),
      );
      const next =
        amount > 0
          ? [
              ...withoutThis,
              {
                id: `pay-${studentId}-${mk}`,
                studentId,
                monthKey: mk,
                amount,
                paidAt: new Date().toISOString(),
              },
            ]
          : withoutThis;
      onUpdatePayments?.(next);
      return next;
    });
  };

  /** გაკვეთილის დამატება */
  const handleAddLesson = async (input: {
    studentId: string;
    groupId: string;
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    startTime: string;
    endTime: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await addLessonSlotAction(input);
    if (res.ok) {
      setLocalStudents((prev) =>
        prev.map((s) =>
          s.id === input.studentId
            ? {
                ...s,
                lessons: [
                  ...s.lessons,
                  {
                    id: res.id,
                    dayOfWeek: input.dayOfWeek,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    groupId: input.groupId,
                  },
                ],
              }
            : s,
        ),
      );
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  /** გაკვეთილის წაშლა */
  const handleDeleteLesson = async (
    lessonId: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await deleteLessonSlotAction({ lessonId });
    if (res.ok) {
      setLocalStudents((prev) =>
        prev.map((s) => ({
          ...s,
          lessons: s.lessons.filter((l) => l.id !== lessonId),
        })),
      );
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  /** ტელეფონების შენახვა */
  const handleSavePhones = async (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
  ): Promise<{ ok: boolean; error?: string }> => {
    // optimistic UI
    setLocalStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              phone: phone ?? '',
              parentPhone: parentPhone ?? undefined,
            }
          : s,
      ),
    );

    if (!onUpdatePhones) return { ok: true };

    const res = await onUpdatePhones(studentId, phone, parentPhone);
    if (!res.ok) {
      // rollback სურვილისამებრ
      console.error('[updatePhones]', res.error);
    }
    return res;
  };

  /* ════════════ Derived data ════════════ */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return localStudents.filter((s) => {
      const matchesQuery =
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.parentPhone?.includes(q) ?? false) ||
        (s.email?.toLowerCase().includes(q) ?? false);
      const matchesGroup =
        activeGroupId === 'all' || s.groupIds.includes(activeGroupId);
      return matchesQuery && matchesGroup;
    });
  }, [localStudents, query, activeGroupId]);

  const stats = useMemo(() => {
    const totalPrice = localStudents.reduce((sum, s) => sum + s.monthlyPrice, 0);
    const totalPaid = localStudents.reduce(
      (sum, s) => sum + sumPaymentsForMonth(payments, s.id, monthKey),
      0,
    );
    const todayCount = localStudents.reduce(
      (sum, s) => sum + getTodayLessons(s.lessons).length,
      0,
    );
    return {
      totalPrice,
      totalPaid,
      todayCount,
      debt: Math.max(0, totalPrice - totalPaid),
    };
  }, [localStudents, payments, monthKey]);

  const isListView = view === 'table' || view === 'grid';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-paper p-3 sm:p-4">
      {/* ════════════ Header ════════════ */}
      <div className="flex flex-col gap-3 rounded-3xl border border-hairline bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-hairline bg-navy-tint text-navy">
              <Users className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink">მოსწავლეები</h1>
              <p className="text-xs font-medium text-muted">
                {localStudents.length} მოსწავლე სულ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-hairline bg-paper p-1">
              <button
                type="button"
                onClick={() => setView('table')}
                title="ცხრილის ხედი"
                className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  view === 'table'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-body hover:bg-surface hover:text-ink'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5 shrink-0" />
                <span>ცხრილი</span>
              </button>

              <button
                type="button"
                onClick={() => setView('grid')}
                title="ბარათების ხედი"
                className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  view === 'grid'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-body hover:bg-surface hover:text-ink'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                <span>ბარათები</span>
              </button>

              <button
                type="button"
                onClick={() => setView('calendar')}
                title="კალენდრის ხედი"
                className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  view === 'calendar'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-body hover:bg-surface hover:text-ink'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>კალენდარი</span>
              </button>
            </div>

            <div className="relative hidden w-64 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ძებნა..."
                className="w-full rounded-xl border border-hairline bg-paper py-2.5 pl-9 pr-3 text-xs font-medium text-ink outline-none transition placeholder:text-muted focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15"
              />
            </div>
          </div>
        </div>

        {isListView ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <Users className="h-3 w-3" /> სულ
                </p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {localStudents.length}
                </p>
              </div>
              <div className="rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <CalendarClock className="h-3 w-3" /> დღეს
                </p>
                <p className="mt-1 text-xl font-bold text-navy">
                  {stats.todayCount}
                </p>
              </div>
              <div className="rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <Wallet className="h-3 w-3" /> უნდა
                </p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {formatPrice(stats.totalPrice)}
                </p>
              </div>
              <div className="rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <Wallet className="h-3 w-3" /> დავალიანება
                </p>
                <p className="mt-1 text-xl font-bold text-loss">
                  {formatPrice(stats.debt)}
                </p>
              </div>
            </div>

            <div className="custom-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="flex shrink-0 items-center gap-1 pr-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                <Filter className="h-3 w-3" /> ჯგუფი
              </span>
              <button
                type="button"
                onClick={() => setActiveGroupId('all')}
                className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                  activeGroupId === 'all'
                    ? 'border-navy bg-navy text-white shadow-sm'
                    : 'border-hairline bg-paper text-body hover:border-navy/40 hover:bg-navy-tint'
                }`}
              >
                ყველა
              </button>
              {groups.map((g) => {
                const active = activeGroupId === g.id;
                const count = localStudents.filter((s) =>
                  s.groupIds.includes(g.id),
                ).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroupId(g.id)}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                      active
                        ? 'border-navy bg-navy text-white shadow-sm'
                        : 'border-hairline bg-paper text-body hover:border-navy/40 hover:bg-navy-tint'
                    }`}
                  >
                    <span>{g.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-paper-deep text-muted'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* ════════════ Content ════════════ */}
      {view === 'calendar' ? (
        <PaymentCalendar
          students={localStudents}
          groups={groups}
          payments={payments}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
          onSetPaid={handleSetPaid}
          onSelectStudent={onSelectStudent}
        />
      ) : (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pe-1">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
              <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-hairline bg-navy-tint text-navy">
                <Users className="size-5" />
              </span>
              <p className="text-sm font-bold text-ink">მოსწავლე ვერ მოიძებნა</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                სცადეთ სხვა საძიებო სიტყვა ან შეცვალეთ ჯგუფის ფილტრი.
              </p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((student) => (
                <StudentListCard
                  key={student.id}
                  view="grid"
                  student={student}
                  groups={groups}
                  payments={payments}
                  monthKey={monthKey}
                  onSelect={(s) => onSelectStudent?.(s)}
                  onUpdateStudent={handleUpdateStudent}
                  onSetPaid={handleSetPaid}
                  onEditLessons={(s) => setLessonEditorStudent(s)}
                  onEditPhones={(s) => setPhoneEditorStudent(s)}
                />
              ))}
            </div>
          ) : (
            <>
              <StudentListTable
                students={filtered}
                groups={groups}
                payments={payments}
                monthKey={monthKey}
                onSelect={(s) => onSelectStudent?.(s)}
                onUpdateStudent={handleUpdateStudent}
                onSetPaid={handleSetPaid}
                onEditLessons={(s) => setLessonEditorStudent(s)}
                onEditPhones={(s) => setPhoneEditorStudent(s)}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                {filtered.map((student) => (
                  <StudentListCard
                    key={student.id}
                    view="table"
                    student={student}
                    groups={groups}
                    payments={payments}
                    monthKey={monthKey}
                    onSelect={(s) => onSelectStudent?.(s)}
                    onUpdateStudent={handleUpdateStudent}
                    onSetPaid={handleSetPaid}
                    onEditLessons={(s) => setLessonEditorStudent(s)}
                    onEditPhones={(s) => setPhoneEditorStudent(s)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════ Lesson Editor Modal ════════════ */}
      {lessonEditorStudent ? (
        <LessonEditorModal
          student={
            localStudents.find((s) => s.id === lessonEditorStudent.id) ??
            lessonEditorStudent
          }
          groups={groups}
          open={true}
          onClose={() => setLessonEditorStudent(null)}
          onAdd={handleAddLesson}
          onDelete={handleDeleteLesson}
        />
      ) : null}

      {/* ════════════ Phone Editor Modal ════════════ */}
      {phoneEditorStudent ? (
        <PhoneEditorModal
          student={
            localStudents.find((s) => s.id === phoneEditorStudent.id) ??
            phoneEditorStudent
          }
          open={true}
          onClose={() => setPhoneEditorStudent(null)}
          onSave={handleSavePhones}
        />
      ) : null}
    </div>
  );
}