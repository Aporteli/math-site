'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Users,
  Wallet,
  CalendarClock,
  Filter,
  CalendarDays,
  Table2 as TableIcon,
  LayoutGrid,
  UserPlus,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { StudentListCard } from './StudentListCard';
import { StudentListTable } from './StudentListTable';
import { PaymentCalendar } from './PaymentCalendar';
import { DebtTracker } from './DebtTracker';
import { ReportsView } from './ReportsView';
import { LessonEditorModal } from './LessonEditorModal';
import { PhoneEditorModal } from './PhoneEditorModal';
import { IndividualStudentModal } from './IndividualStudentModal';
import { PaymentHistoryModal } from './PaymentHistoryModal';
import { formatPrice, getTodayLessons, sectionStudents } from '../studentList.helpers';
import {
  getMonthKey,
  sumPaymentsForMonth,
  computeExpectedForMonth,
  parseMonthKey,
} from '../paymentCalendar.helpers';
import {
  addLessonSlotAction,
  deleteLessonSlotAction,
  addIndividualLessonAction,
  deleteIndividualLessonAction,
} from '@/components/lms/teacher/student-list/actions';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../studentList.types';

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

  onCreateIndividual?: (input: {
    firstName: string;
    lastName: string;
    phone?: string;
    parentPhone?: string;
    email?: string;
    monthlyPrice?: number;
    note?: string;
  }) => Promise<{ ok: boolean; error?: string; id?: string }>;
  onUpdateIndividual?: (
    studentId: string,
    patch: Partial<StudentRecord>,
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteIndividual?: (studentId: string) => Promise<{ ok: boolean; error?: string }>;

  /* Group payments (add/delete) */
  onAddGroupPayment?: (input: {
    studentId: string;
    amount: number;
    paidAt: string;
    method?: 'cash' | 'card' | 'transfer';
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteGroupPayment?: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;

  /* Individual payments (add/delete) */
  onAddIndividualPayment?: (input: {
    studentId: string;
    amount: number;
    paidAt: string;
    method?: 'cash' | 'card' | 'transfer';
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteIndividualPayment?: (
    paymentId: string,
  ) => Promise<{ ok: boolean; error?: string }>;

  /* Missed lesson toggle */
  onToggleMissed?: (
    studentId: string,
    lessonId: string,
    date: string,
    missed: boolean,
  ) => void;
}

type View = 'table' | 'grid' | 'calendar' | 'debt' | 'reports';

export function StudentList({
  students,
  groups,
  initialPayments = [],
  onSelectStudent,
  onUpdateStudent,
  onUpdatePayments,
  onUpdatePhones,
  onCreateIndividual,
  onUpdateIndividual,
  onDeleteIndividual,
  onAddGroupPayment,
  onDeleteGroupPayment,
  onAddIndividualPayment,
  onDeleteIndividualPayment,
  onToggleMissed,
}: Props) {
  const [view, setView] = useState<View>('table');
  const [query, setQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | 'all'>('all');
  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));

  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);

  const studentsRef = useRef(students);
  studentsRef.current = students;

  const paymentsRef = useRef(payments);
  paymentsRef.current = payments;

  const [lessonEditorStudent, setLessonEditorStudent] = useState<StudentRecord | null>(null);
  const [phoneEditorStudent, setPhoneEditorStudent] = useState<StudentRecord | null>(null);

  const [individualModalOpen, setIndividualModalOpen] = useState(false);
  const [editingIndividual, setEditingIndividual] = useState<StudentRecord | null>(null);
  const [paymentHistoryStudent, setPaymentHistoryStudent] = useState<StudentRecord | null>(null);

  useEffect(() => setPayments(initialPayments), [initialPayments]);

  /* ════════════ FRESH STUDENT ობიექტი მოდალისთვის ════════════ */
  const currentPaymentStudent = useMemo(() => {
    if (!paymentHistoryStudent) return null;
    return (
      students.find((s) => s.id === paymentHistoryStudent.id) ??
      paymentHistoryStudent
    );
  }, [paymentHistoryStudent, students]);

  const currentEditingIndividual = useMemo(() => {
    if (!editingIndividual) return null;
    return (
      students.find((s) => s.id === editingIndividual.id) ?? editingIndividual
    );
  }, [editingIndividual, students]);

  const currentLessonStudent = useMemo(() => {
    if (!lessonEditorStudent) return null;
    return (
      students.find((s) => s.id === lessonEditorStudent.id) ?? lessonEditorStudent
    );
  }, [lessonEditorStudent, students]);

  const currentPhoneStudent = useMemo(() => {
    if (!phoneEditorStudent) return null;
    return (
      students.find((s) => s.id === phoneEditorStudent.id) ?? phoneEditorStudent
    );
  }, [phoneEditorStudent, students]);

  const handleUpdateStudent = (id: string, patch: Partial<StudentRecord>) => {
    onUpdateStudent?.(id, patch);
  };

  const handleSetPaid = (studentId: string, mk: string, amount: number) => {
    const prev = paymentsRef.current;
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

    setPayments(next);
    onUpdatePayments?.(next);
  };

  /* ─── Unified payment handlers for modal ─── */
  const handleAddPaymentForModal = async (input: {
    studentId: string;
    amount: number;
    paidAt: string;
    method?: 'cash' | 'card' | 'transfer';
    note?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const student = students.find((s) => s.id === input.studentId);
    if (!student) return { ok: false, error: 'მოსწავლე ვერ მოიძებნა' };

    const res =
      student.kind === 'individual'
        ? await (onAddIndividualPayment?.(input) ??
            Promise.resolve({ ok: false, error: 'Not configured' }))
        : await (onAddGroupPayment?.(input) ??
            Promise.resolve({ ok: false, error: 'Not configured' }));

    return res;
  };

  const handleDeletePaymentForModal = async (
    paymentId: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return { ok: false, error: 'გადახდა ვერ მოიძებნა' };
    const student = students.find((s) => s.id === payment.studentId);
    if (!student) return { ok: false, error: 'მოსწავლე ვერ მოიძებნა' };

    const res =
      student.kind === 'individual'
        ? await (onDeleteIndividualPayment?.(paymentId) ??
            Promise.resolve({ ok: false, error: 'Not configured' }))
        : await (onDeleteGroupPayment?.(paymentId) ??
            Promise.resolve({ ok: false, error: 'Not configured' }));

    return res;
  };

  const handleAddLesson = async (input: {
    studentId: string;
    groupId: string;
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    startTime: string;
    endTime: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const student = students.find((s) => s.id === input.studentId);
    const isIndividual = student?.kind === 'individual';

    if (isIndividual) {
      const res = await addIndividualLessonAction({
        studentId: input.studentId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
      });
      if (!res.ok) return { ok: false, error: res.error };

      const current = studentsRef.current.find((s) => s.id === input.studentId);
      handleUpdateStudent(input.studentId, {
        lessons: [
          ...(current?.lessons ?? []),
          {
            id: res.id,
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
            groupId: '',
          },
        ],
      });
      return { ok: true };
    }

    const res = await addLessonSlotAction(input);
    if (!res.ok) return { ok: false, error: res.error };

    const copies =
      res.copies.length > 0
        ? res.copies
        : [{ studentId: input.studentId, lessonId: res.id }];

    for (const copy of copies) {
      const current = studentsRef.current.find((s) => s.id === copy.studentId);
      if (
        current?.lessons.some(
          (l) =>
            l.id === copy.lessonId ||
            (l.groupId === input.groupId &&
              l.dayOfWeek === input.dayOfWeek &&
              l.startTime === input.startTime &&
              l.endTime === input.endTime),
        )
      ) {
        continue;
      }
      handleUpdateStudent(copy.studentId, {
        lessons: [
          ...(current?.lessons ?? []),
          {
            id: copy.lessonId,
            dayOfWeek: input.dayOfWeek,
            startTime: input.startTime,
            endTime: input.endTime,
            groupId: input.groupId,
          },
        ],
      });
    }
    return { ok: true };
  };

  const handleDeleteLesson = async (lessonId: string): Promise<{ ok: boolean; error?: string }> => {
    let lessonOwner: StudentRecord | undefined;
    for (const s of students) {
      if (s.lessons.some((l) => l.id === lessonId)) {
        lessonOwner = s;
        break;
      }
    }

    const isIndividual = lessonOwner?.kind === 'individual';

    if (isIndividual) {
      const res = await deleteIndividualLessonAction({ lessonId });
      if (!res.ok) return { ok: false, error: res.error };

      const owner = studentsRef.current.find((s) =>
        s.lessons.some((l) => l.id === lessonId),
      );
      if (owner) {
        handleUpdateStudent(owner.id, {
          lessons: owner.lessons.filter((l) => l.id !== lessonId),
        });
      }
      return { ok: true };
    }

    const res = await deleteLessonSlotAction({ lessonId });
    if (!res.ok) return { ok: false, error: res.error };

    const { groupId, dayOfWeek, startTime, endTime } = res.match;
    for (const owner of studentsRef.current) {
      const next = owner.lessons.filter(
        (l) =>
          !(
            l.groupId === groupId &&
            l.dayOfWeek === dayOfWeek &&
            l.startTime === startTime &&
            l.endTime === endTime
          ),
      );
      if (next.length !== owner.lessons.length) {
        handleUpdateStudent(owner.id, { lessons: next });
      }
    }
    return { ok: true };
  };

  const handleSavePhones = async (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!onUpdatePhones) return { ok: true };

    const res = await onUpdatePhones(studentId, phone, parentPhone);
    if (!res.ok) {
      console.error('[updatePhones]', res.error);
    }
    return res;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
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
  }, [students, query, activeGroupId]);

  const listSections = useMemo(
    () =>
      sectionStudents(
        filtered,
        groups,
        activeGroupId === 'all' ? undefined : activeGroupId,
      ),
    [filtered, groups, activeGroupId],
  );

  const groupMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of groups) {
      counts[group.id] = students.filter((s) => s.groupIds.includes(group.id)).length;
    }
    return counts;
  }, [students, groups]);

  const stats = useMemo(() => {
    const { year, month } = parseMonthKey(monthKey);
    const totalPrice = students.reduce(
      (sum, s) => sum + computeExpectedForMonth(s, year, month),
      0,
    );
    const totalPaid = students.reduce(
      (sum, s) => sum + sumPaymentsForMonth(payments, s.id, monthKey),
      0,
    );
    const todayCount = students.reduce(
      (sum, s) => sum + getTodayLessons(s.lessons).length,
      0,
    );
    return {
      totalPrice,
      totalPaid,
      todayCount,
      debt: Math.max(0, totalPrice - totalPaid),
    };
  }, [students, payments, monthKey]);

  const isListView = view === 'table' || view === 'grid';

  const viewButtonClass = (active: boolean) =>
    `inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-xl px-1.5 py-2 text-xs font-bold transition sm:min-h-10 sm:px-3 ${
      active ? 'bg-navy text-white shadow-sm' : 'text-body hover:bg-surface hover:text-ink'
    }`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-hairline bg-surface p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-navy-tint text-navy">
              <Users className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-ink sm:text-lg">მოსწავლეები</h1>
              <p className="text-xs font-medium text-muted">{students.length} მოსწავლე სულ</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid w-full grid-cols-5 gap-1 rounded-2xl border border-hairline bg-paper p-1 sm:w-auto sm:min-w-[28rem]">
              <button
                type="button"
                onClick={() => setView('table')}
                title="ცხრილის ხედი"
                aria-pressed={view === 'table'}
                className={viewButtonClass(view === 'table')}>
                <TableIcon className="size-4 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">ცხრილი</span>
              </button>

              <button
                type="button"
                onClick={() => setView('grid')}
                title="ბარათების ხედი"
                aria-pressed={view === 'grid'}
                className={viewButtonClass(view === 'grid')}>
                <LayoutGrid className="size-4 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">ბარათები</span>
              </button>

              <button
                type="button"
                onClick={() => setView('calendar')}
                title="კალენდრის ხედი"
                aria-pressed={view === 'calendar'}
                className={viewButtonClass(view === 'calendar')}>
                <CalendarDays className="size-4 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">კალენდარი</span>
              </button>

              <button
                type="button"
                onClick={() => setView('debt')}
                title="დავალიანებები"
                aria-pressed={view === 'debt'}
                className={viewButtonClass(view === 'debt')}>
                <AlertCircle className="size-4 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">ვალები</span>
              </button>

              <button
                type="button"
                onClick={() => setView('reports')}
                title="ანგარიში"
                aria-pressed={view === 'reports'}
                className={viewButtonClass(view === 'reports')}>
                <BarChart3 className="size-4 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">ანგარიში</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingIndividual(null);
                setIndividualModalOpen(true);
              }}
              title="ინდივიდუალური მოსწავლის დამატება"
              className="inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brass-strong px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brass"
            >
              <UserPlus className="size-4 shrink-0" />
              <span className="truncate">სახლში</span>
            </button>
          </div>
        </div>

        {isListView ? (
          <>
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="სახელი, ტელეფონი ან ელფოსტა"
                className="w-full rounded-xl border border-hairline bg-paper py-2.5 pl-10 pr-3 text-base font-medium text-ink outline-none transition placeholder:text-muted focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
                  <Users className="size-3 shrink-0 text-navy" /> სულ
                </p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums text-ink sm:text-xl">
                  {students.length}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
                  <CalendarClock className="size-3 shrink-0 text-brass-strong" /> დღეს
                </p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums text-navy sm:text-xl">
                  {stats.todayCount}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
                  <Wallet className="size-3 shrink-0 text-brass-strong" /> ჯამში
                </p>
                <p className="mt-1 truncate text-base font-bold tabular-nums text-ink sm:text-xl">
                  {formatPrice(stats.totalPrice)}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl border border-hairline bg-paper px-3 py-2.5">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">
                  <Wallet className="size-3 shrink-0 text-loss" /> გადასახდელი
                </p>
                <p className="mt-1 truncate text-base font-bold tabular-nums text-loss sm:text-xl">
                  {formatPrice(stats.debt)}
                </p>
              </div>
            </div>

            <div className="custom-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
              <span className="flex shrink-0 items-center gap-1 pr-1 text-[10px] font-bold tracking-wide text-muted">
                <Filter className="size-3" /> ჯგუფი
              </span>
              <button
                type="button"
                onClick={() => setActiveGroupId('all')}
                className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                  activeGroupId === 'all'
                    ? 'border-navy bg-navy text-white shadow-sm'
                    : 'border-hairline bg-paper text-body hover:border-navy/40 hover:bg-navy-tint'
                }`}>
                ყველა
              </button>
              {groups.map((g) => {
                const active = activeGroupId === g.id;
                const count = students.filter((s) => s.groupIds.includes(g.id)).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroupId(g.id)}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                      active
                        ? 'border-navy bg-navy text-white shadow-sm'
                        : 'border-hairline bg-paper text-body hover:border-navy/40 hover:bg-navy-tint'
                    }`}>
                    <span>{g.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-paper-deep text-muted'
                      }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {view === 'calendar' ? (
        <PaymentCalendar
          students={students}
          groups={groups}
          payments={payments}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
          onSetPaid={handleSetPaid}
          onSelectStudent={onSelectStudent}
          onToggleMissed={onToggleMissed}
        />
      ) : view === 'debt' ? (
        <DebtTracker
          students={students}
          groups={groups}
          payments={payments}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
          onManagePayments={(s) => setPaymentHistoryStudent(s)}
          onEditPhones={(s) => setPhoneEditorStudent(s)}
        />
      ) : view === 'reports' ? (
        <ReportsView
          students={students}
          groups={groups}
          payments={payments}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
        />
      ) : (
        <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
              <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl border border-hairline bg-navy-tint text-navy">
                <Users className="size-5" />
              </span>
              <p className="text-sm font-bold text-ink">მოსწავლე ვერ მოიძებნა</p>
              <p className="mt-1 max-w-xs text-xs text-muted">სცადეთ სხვა საძიებო სიტყვა ან შეცვალეთ ჯგუფის ფილტრი.</p>
            </div>
          ) : view === 'grid' ? (
            <div className="space-y-5">
              {listSections.map((section) => (
                <section key={section.key} className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2">
                    <span className={`size-1.5 shrink-0 rounded-full ${section.kind === 'group' ? 'bg-navy' : 'bg-brass-strong'}`} />
                    <h2 className="text-xs font-bold tracking-wide text-ink">
                      {section.title}
                    </h2>
                    <span className="rounded-full bg-paper-deep px-1.5 py-0.5 text-[10px] font-bold text-muted">
                      {section.students.length}
                    </span>
                    {section.kind === 'group' ? (
                      <span className="hidden text-[10px] font-medium text-muted sm:inline">
                        საერთო განრიგი · გადახდა ცალ-ცალკე
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {section.students.map((student) => (
                      <StudentListCard
                        key={student.id}
                        view="grid"
                        student={student}
                        groups={groups}
                        payments={payments}
                        monthKey={monthKey}
                        classmateCount={
                          section.groupId
                            ? groupMemberCounts[section.groupId]
                            : undefined
                        }
                        onSelect={(s) => onSelectStudent?.(s)}
                        onEditLessons={(s) => setLessonEditorStudent(s)}
                        onEditPhones={(s) => setPhoneEditorStudent(s)}
                        onManagePayments={(s) => setPaymentHistoryStudent(s)}
                        onEditIndividual={(s) => {
                          setEditingIndividual(s);
                          setIndividualModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <>
              <StudentListTable
                sections={listSections}
                groups={groups}
                payments={payments}
                monthKey={monthKey}
                groupMemberCounts={groupMemberCounts}
                onSelect={(s) => onSelectStudent?.(s)}
                onEditLessons={(s) => setLessonEditorStudent(s)}
                onEditPhones={(s) => setPhoneEditorStudent(s)}
                onManagePayments={(s) => setPaymentHistoryStudent(s)}
                onEditIndividual={(s) => {
                  setEditingIndividual(s);
                  setIndividualModalOpen(true);
                }}
              />
              <div className="space-y-5 lg:hidden">
                {listSections.map((section) => (
                  <section key={section.key} className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2">
                      <span className={`size-1.5 shrink-0 rounded-full ${section.kind === 'group' ? 'bg-navy' : 'bg-brass-strong'}`} />
                      <h2 className="text-xs font-bold tracking-wide text-ink">
                        {section.title}
                      </h2>
                      <span className="rounded-full bg-paper-deep px-1.5 py-0.5 text-[10px] font-bold text-muted">
                        {section.students.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {section.students.map((student) => (
                        <StudentListCard
                          key={student.id}
                          view="table"
                          student={student}
                          groups={groups}
                          payments={payments}
                          monthKey={monthKey}
                          classmateCount={
                            section.groupId
                              ? groupMemberCounts[section.groupId]
                              : undefined
                          }
                          onSelect={(s) => onSelectStudent?.(s)}
                          onEditLessons={(s) => setLessonEditorStudent(s)}
                          onEditPhones={(s) => setPhoneEditorStudent(s)}
                          onManagePayments={(s) => setPaymentHistoryStudent(s)}
                          onEditIndividual={(s) => {
                            setEditingIndividual(s);
                            setIndividualModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════ Lesson Editor Modal ════════════ */}
      {currentLessonStudent ? (
        <LessonEditorModal
          student={currentLessonStudent}
          groups={groups}
          groupMemberCounts={groupMemberCounts}
          open={true}
          onClose={() => setLessonEditorStudent(null)}
          onAdd={handleAddLesson}
          onDelete={handleDeleteLesson}
        />
      ) : null}

      {/* ════════════ Phone Editor Modal ════════════ */}
      {currentPhoneStudent ? (
        <PhoneEditorModal
          student={currentPhoneStudent}
          open={true}
          onClose={() => setPhoneEditorStudent(null)}
          onSave={handleSavePhones}
        />
      ) : null}

      {/* ════════════ Individual Student Modal ════════════ */}
      <IndividualStudentModal
        open={individualModalOpen}
        student={currentEditingIndividual}
        onClose={() => {
          setIndividualModalOpen(false);
          setEditingIndividual(null);
        }}
        onCreate={async (input) => (await onCreateIndividual?.(input)) ?? { ok: false, error: 'Not configured' }}
        onUpdate={async (id, patch) => (await onUpdateIndividual?.(id, patch)) ?? { ok: false, error: 'Not configured' }}
        onDelete={async (id) => (await onDeleteIndividual?.(id)) ?? { ok: false, error: 'Not configured' }}
      />

      {/* ════════════ Payment History Modal (FRESH student) ════════════ */}
      <PaymentHistoryModal
        open={Boolean(currentPaymentStudent)}
        student={currentPaymentStudent}
        payments={payments}
        onClose={() => setPaymentHistoryStudent(null)}
        onAddPayment={handleAddPaymentForModal}
        onDeletePayment={handleDeletePaymentForModal}
        onUpdateStudent={handleUpdateStudent}
      />
    </div>
  );
}