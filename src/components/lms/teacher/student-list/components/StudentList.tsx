'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Wallet,
  CalendarClock,
  Filter,
  ChevronDown,
  Table2 as TableIcon,
  UserPlus,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { StudentListTable } from './StudentListTable';
import { DebtTracker } from './DebtTracker';
import { ReportsView } from './ReportsView';
import { LessonEditorModal } from './LessonEditorModal';
import { PhoneEditorModal } from './PhoneEditorModal';
import { IndividualStudentModal } from './IndividualStudentModal';
import { PaymentHistoryModal } from './PaymentHistoryModal';
import { formatPrice, countTodayLessonSessions, sectionStudents } from '../studentList.helpers';
import { getMonthKey, sumPaymentsForMonth, computeExpectedForMonth, parseMonthKey } from '../paymentCalendar.helpers';
import {
  addLessonSlotAction,
  deleteLessonSlotAction,
  addIndividualLessonAction,
  deleteIndividualLessonAction,
} from '@/components/lms/teacher/student-list/actions';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../studentList.types';
import { defaultLocale, isLocale, localePath } from '@/i18n/config';

interface Props {
  students: StudentRecord[];
  groups: StudentGroup[];
  initialPayments?: PaymentRecord[];
  onSelectStudent?: (student: StudentRecord) => void;
  studentId?: string;
  onUpdateStudent?: (id: string, patch: Partial<StudentRecord>) => void;
  onUpdatePayments?: (payments: PaymentRecord[]) => void;
  onUpdatePhones?: (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
    email?: string | null,
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
  onUpdateIndividual?: (studentId: string, patch: Partial<StudentRecord>) => Promise<{ ok: boolean; error?: string }>;
  onDeleteIndividual?: (studentId: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateHomeGroup?: (input: {
    name: string;
    studentIds: string[];
  }) => Promise<{ ok: boolean; error?: string; id?: string }>;
  onDisbandHomeGroup?: (groupId: string) => Promise<{ ok: boolean; error?: string }>;

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
  onDeleteIndividualPayment?: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;

  /* Missed lesson toggle */
  onToggleMissed?: (studentId: string, lessonId: string, date: string, missed: boolean) => void;
}

type View = 'table' | 'debt' | 'reports';

export function StudentList({
  students,
  groups,
  initialPayments = [],
  onSelectStudent,
  studentId,
  onUpdateStudent,
  onUpdatePhones,
  onCreateIndividual,
  onUpdateIndividual,
  onDeleteIndividual,
  onCreateHomeGroup,
  onDisbandHomeGroup,
  onAddGroupPayment,
  onDeleteGroupPayment,
  onAddIndividualPayment,
  onDeleteIndividualPayment,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const localeSegment = pathname.split('/')[1] ?? '';
  const locale = isLocale(localeSegment) ? localeSegment : defaultLocale;

  const [view, setView] = useState<View>('table');
  const [studentSection, setStudentSection] = useState<'pricing' | 'schedule'>('pricing');
  const [query, setQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | 'all'>('all');
  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));

  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);

  const studentsRef = useRef(students);
  studentsRef.current = students;

  const [lessonEditorStudent, setLessonEditorStudent] = useState<StudentRecord | null>(null);
  const [phoneEditorStudent, setPhoneEditorStudent] = useState<StudentRecord | null>(null);

  const [individualModalOpen, setIndividualModalOpen] = useState(false);
  const [homeGroupOpen, setHomeGroupOpen] = useState(false);
  const [homeGroupName, setHomeGroupName] = useState('');
  const [homeGroupStudentIds, setHomeGroupStudentIds] = useState<string[]>([]);
  const [homeGroupError, setHomeGroupError] = useState<string | null>(null);
  const [homeGroupSaving, setHomeGroupSaving] = useState(false);
  const [editingIndividual, setEditingIndividual] = useState<StudentRecord | null>(null);
  const [paymentHistoryStudent, setPaymentHistoryStudent] = useState<StudentRecord | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  useEffect(() => setPayments(initialPayments), [initialPayments]);

  /* ════════════ FRESH STUDENT ობიექტი მოდალისთვის ════════════ */
  const currentPaymentStudent = useMemo(() => {
    if (!paymentHistoryStudent) return null;
    return students.find((s) => s.id === paymentHistoryStudent.id) ?? paymentHistoryStudent;
  }, [paymentHistoryStudent, students]);

  const currentEditingIndividual = useMemo(() => {
    if (!editingIndividual) return null;
    return students.find((s) => s.id === editingIndividual.id) ?? editingIndividual;
  }, [editingIndividual, students]);

  const currentLessonStudent = useMemo(() => {
    if (!lessonEditorStudent) return null;
    return students.find((s) => s.id === lessonEditorStudent.id) ?? lessonEditorStudent;
  }, [lessonEditorStudent, students]);

  const currentPhoneStudent = useMemo(() => {
    if (!phoneEditorStudent) return null;
    return students.find((s) => s.id === phoneEditorStudent.id) ?? phoneEditorStudent;
  }, [phoneEditorStudent, students]);

  const handleUpdateStudent = (id: string, patch: Partial<StudentRecord>) => {
    onUpdateStudent?.(id, patch);
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
        ? await (onAddIndividualPayment?.(input) ?? Promise.resolve({ ok: false, error: 'Not configured' }))
        : await (onAddGroupPayment?.(input) ?? Promise.resolve({ ok: false, error: 'Not configured' }));

    return res;
  };

  const handleDeletePaymentForModal = async (paymentId: string): Promise<{ ok: boolean; error?: string }> => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return { ok: false, error: 'გადახდა ვერ მოიძებნა' };
    const student = students.find((s) => s.id === payment.studentId);
    if (!student) return { ok: false, error: 'მოსწავლე ვერ მოიძებნა' };

    const res =
      student.kind === 'individual'
        ? await (onDeleteIndividualPayment?.(paymentId) ?? Promise.resolve({ ok: false, error: 'Not configured' }))
        : await (onDeleteGroupPayment?.(paymentId) ?? Promise.resolve({ ok: false, error: 'Not configured' }));

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

      const homeGroupId = studentsRef.current.find((s) => s.id === input.studentId)?.homeGroupId ?? '';
      const copies = res.copies.length > 0 ? res.copies : [{ studentId: input.studentId, lessonId: res.id }];

      for (const copy of copies) {
        const current = studentsRef.current.find((s) => s.id === copy.studentId);
        if (
          current?.lessons.some(
            (l) =>
              l.id === copy.lessonId ||
              (l.dayOfWeek === input.dayOfWeek && l.startTime === input.startTime && l.endTime === input.endTime),
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
              groupId: homeGroupId,
            },
          ],
        });
      }
      return { ok: true };
    }

    const res = await addLessonSlotAction(input);
    if (!res.ok) return { ok: false, error: res.error };

    const copies = res.copies.length > 0 ? res.copies : [{ studentId: input.studentId, lessonId: res.id }];

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

      if (res.match) {
        const { groupId, dayOfWeek, startTime, endTime } = res.match;
        for (const owner of studentsRef.current) {
          if (owner.homeGroupId !== groupId) continue;
          const next = owner.lessons.filter(
            (l) => !(l.dayOfWeek === dayOfWeek && l.startTime === startTime && l.endTime === endTime),
          );
          if (next.length !== owner.lessons.length) {
            handleUpdateStudent(owner.id, { lessons: next });
          }
        }
        return { ok: true };
      }

      const owner = studentsRef.current.find((s) => s.lessons.some((l) => l.id === lessonId));
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
          !(l.groupId === groupId && l.dayOfWeek === dayOfWeek && l.startTime === startTime && l.endTime === endTime),
      );
      if (next.length !== owner.lessons.length) {
        handleUpdateStudent(owner.id, { lessons: next });
      }
    }
    return { ok: true };
  };

  const handleDisbandHomeGroup = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    const name = group?.name ?? 'ჯგუფი';
    if (!window.confirm(`დავშალოთ „${name}“? მოსწავლეები და მათი გადახდები დარჩება.`)) return;
    const res = await onDisbandHomeGroup?.(groupId);
    if (res && !res.ok) window.alert(res.error ?? 'ჯგუფის დაშლა ვერ მოხერხდა');
  };

  const ungroupedHomeStudents = students.filter((s) => s.kind === 'individual' && !s.homeGroupId);

  const handleCreateHomeGroup = async () => {
    setHomeGroupError(null);
    const name = homeGroupName.trim();
    if (!name) {
      setHomeGroupError('ჯგუფის სახელი სავალდებულოა');
      return;
    }
    if (homeGroupStudentIds.length < 2) {
      setHomeGroupError('აირჩიე მინიმუმ ორი მოსწავლე');
      return;
    }
    setHomeGroupSaving(true);
    const res = await onCreateHomeGroup?.({ name, studentIds: homeGroupStudentIds });
    setHomeGroupSaving(false);
    if (!res?.ok) {
      setHomeGroupError(res?.error ?? 'ჯგუფის შექმნა ვერ მოხერხდა');
      return;
    }
    setHomeGroupOpen(false);
    setHomeGroupName('');
    setHomeGroupStudentIds([]);
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

  const today = new Date();
  const todayDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students.filter((s) => {
      const matchesQuery =
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.parentPhone?.includes(q) ?? false) ||
        (s.email?.toLowerCase().includes(q) ?? false);

      const matchesGroup = activeGroupId === 'all' || s.groupIds.includes(activeGroupId);

      const matchesToday = !showTodayOnly || s.lessons.some((lesson) => lesson.dayOfWeek === todayDayOfWeek);

      return matchesQuery && matchesGroup && matchesToday;
    });
  }, [students, query, activeGroupId, showTodayOnly, todayDayOfWeek]);

  const listSections = useMemo(
    () => sectionStudents(filtered, groups, activeGroupId === 'all' ? undefined : activeGroupId),
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
    const totalPrice = students.reduce((sum, s) => sum + computeExpectedForMonth(s, year, month), 0);
    const totalPaid = students.reduce((sum, s) => sum + sumPaymentsForMonth(payments, s.id, monthKey), 0);
    const todayCount = countTodayLessonSessions(students);

    return {
      totalPrice,
      totalPaid,
      todayCount,
      debt: Math.max(0, totalPrice - totalPaid),
    };
  }, [students, payments, monthKey]);

  const isListView = view === 'table';

  const openStudentPage = (student: StudentRecord) => {
    router.push(localePath(locale, `/teacher/student-list/${student.id}`));
  };

  if (studentId) {
    const student = students.find((item) => item.id === studentId) ?? null;

    return (
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(localePath(locale, '/teacher/student-list'))}
              className="cursor-pointer rounded-box border border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-ink transition-all duration-200 hover:bg-paper-deep active:scale-[0.98]">
              უკან
            </button>
            <p className="truncate text-sm font-bold text-ink">
              {student ? `${student.firstName} ${student.lastName}` : 'მოსწავლე ვერ მოიძებნა'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-main p-1">
            {(
              [
                ['pricing', 'ფასი'],
                ['schedule', 'განრიგი'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStudentSection(key)}
                className={`group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-box px-3 py-2 text-xs font-bold transition-all duration-200 ${
                  studentSection === key ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
                }`}>
                <span className="relative z-10">{label}</span>
                <span
                  className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                    studentSection === key ? 'w-[calc(100%-16px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {student ? (
          <div className="flex min-w-0 flex-col gap-4">
            {studentSection === 'pricing' ? (
              <PaymentHistoryModal
                embedded
                open
                student={student}
                payments={payments}
                onClose={() => {}}
                onAddPayment={handleAddPaymentForModal}
                onDeletePayment={handleDeletePaymentForModal}
                onUpdateStudent={handleUpdateStudent}
              />
            ) : null}

            {studentSection === 'schedule' ? (
              <LessonEditorModal
                embedded
                open
                student={student}
                groups={groups}
                groupMemberCounts={groupMemberCounts}
                onClose={() => {}}
                onAdd={handleAddLesson}
                onDelete={handleDeleteLesson}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const viewButtonClass = (active: boolean) =>
    `group relative inline-flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-box px-1.5 py-2 text-xs font-bold transition-all duration-200 sm:min-h-10 sm:px-3 ${
      active ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
    }`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
        <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden sm:flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center  text-brass-strong">
              <Users className="size-7" strokeWidth={2.5}/>
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid w-full grid-cols-3 gap-1 bg-main p-1 sm:flex sm:w-auto sm:min-w-[16rem]">
              <button
                type="button"
                onClick={() => setView('table')}
                title="ცხრილის ხედი"
                aria-pressed={view === 'table'}
                className={viewButtonClass(view === 'table')}>
                <TableIcon className="relative z-10 size-4 shrink-0" />
                <span className="relative z-10 truncate text-[11px] sm:text-xs">ცხრილი</span>
                <span
                  className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                    view === 'table' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setView('debt')}
                title="დავალიანებები"
                aria-pressed={view === 'debt'}
                className={viewButtonClass(view === 'debt')}>
                <AlertCircle className="relative z-10 size-4 shrink-0" />
                <span className="relative z-10 truncate text-[11px] sm:text-xs">ვალები</span>
                <span
                  className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                    view === 'debt' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setView('reports')}
                title="ანგარიში"
                aria-pressed={view === 'reports'}
                className={viewButtonClass(view === 'reports')}>
                <BarChart3 className="relative z-10 size-4 shrink-0" />
                <span className="relative z-10 truncate text-[11px] sm:text-xs">ანგარიში</span>
                <span
                  className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                    view === 'reports' ? 'w-[calc(100%-12px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingIndividual(null);
                setIndividualModalOpen(true);
              }}
              title="ინდივიდუალური მოსწავლის დამატება"
              className="inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#A66A32] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_12px_rgba(166,106,50,0.28)] active:scale-[0.98]">
              <UserPlus className="size-4 shrink-0" />
              <span className="truncate">სახლში</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setHomeGroupName('');
                setHomeGroupStudentIds([]);
                setHomeGroupError(null);
                setHomeGroupOpen(true);
              }}
              title="სახლში მოსული მოსწავლეების ჯგუფი"
              className="inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-box bg-[#465D73] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
              <Users className="size-4 shrink-0" />
              <span className="truncate">ჯგუფი</span>
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
                className="w-full rounded-box border border-hairline bg-searchInput py-2.5 pl-10 pr-3 text-xs font-medium text-searchInputText outline-none transition placeholder:text-searchInputText focus:border-navy focus:bg-searchInput sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">მოსწავლეები</p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums text-ink sm:text-xl">{students.length}</p>
              </div>
              <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">გაკვეთილები</p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums text-[#465D73] sm:text-xl">{stats.todayCount}</p>
              </div>
              <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">ჯამში</p>
                <p className="mt-1 truncate text-base font-bold tabular-nums text-ink sm:text-xl">
                  {formatPrice(stats.totalPrice)}
                </p>
              </div>
              <div className="min-w-0 rounded-box border border-hairline bg-main px-3 py-2.5 shadow-sm">
                <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-muted">გადასახდელი</p>
                <p className="mt-1 truncate text-base font-bold tabular-nums text-loss sm:text-xl">
                  {formatPrice(stats.debt)}
                </p>
              </div>
            </div>

            <div className="relative w-fit max-w-full">
              <button
                type="button"
                onClick={() => setGroupMenuOpen((open) => !open)}
                className="inline-flex h-8 max-w-full cursor-pointer items-center justify-between gap-1.5 rounded-box border border-hairline bg-searchInput px-2.5 text-[11px] font-bold text-searchInputText transition-all duration-200 hover:border-navy"
              >
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate">
                    {showTodayOnly
                      ? 'დღეს'
                      : activeGroupId === 'all'
                        ? 'ყველა'
                        : (groups.find((g) => g.id === activeGroupId)?.name ?? 'ყველა')}
                  </span>
                </span>
                <ChevronDown
                  className={`size-3 shrink-0 text-muted transition-transform ${groupMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {groupMenuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="დახურვა"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setGroupMenuOpen(false)}
                  />
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-max min-w-full max-w-[16rem] overflow-y-auto rounded-box border border-hairline bg-main p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveGroupId('all');
                        setShowTodayOnly(false);
                        setGroupMenuOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center rounded-box px-2 py-1.5 text-left text-[11px] font-bold transition-all duration-200 ${
                        activeGroupId === 'all' && !showTodayOnly
                          ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                          : 'text-mainText hover:bg-sectionHeader'
                      }`}
                    >
                      ყველა
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTodayOnly(true);
                        setGroupMenuOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center rounded-box px-2 py-1.5 text-left text-[11px] font-bold transition-all duration-200 ${
                        showTodayOnly
                          ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                          : 'text-mainText hover:bg-sectionHeader'
                      }`}
                    >
                      დღეს
                    </button>
                    {groups.map((g) => {
                      const active = activeGroupId === g.id && !showTodayOnly;
                      const count = students.filter((s) => s.groupIds.includes(g.id)).length;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setActiveGroupId(g.id);
                            setShowTodayOnly(false);
                            setGroupMenuOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-box px-2 py-1.5 text-left text-[11px] font-bold transition-all duration-200 ${
                            active
                              ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                              : g.home
                                ? 'text-brass-strong hover:bg-brass-tint'
                                : 'text-mainText hover:bg-sectionHeader'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            {g.home ? <span className="text-[9px] font-bold uppercase">სახლში</span> : null}
                            <span className="truncate">{g.name}</span>
                          </span>
                          <span
                            className={`rounded-box px-1.5 py-0.5 text-[9px] font-bold ${
                              active ? 'text-mainText' : 'text-muted'
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
          </>
        ) : null}
        </div>
      </div>

      {view === 'debt' ? (
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
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-box border border-dashed border-hairline bg-surface px-6 py-16 text-center">
              <span className="mb-3 inline-flex size-12 items-center justify-center rounded-box border border-hairline bg-brass-tint text-brass-strong">
                <Users className="size-5" />
              </span>
              <p className="text-sm font-bold text-ink">მოსწავლე ვერ მოიძებნა</p>
              <p className="mt-1 max-w-xs text-xs text-muted">სცადეთ სხვა საძიებო სიტყვა ან შეცვალეთ ჯგუფის ფილტრი.</p>
            </div>
          ) : (
            <>
              <StudentListTable
                sections={listSections}
                groups={groups}
                payments={payments}
                monthKey={monthKey}
                groupMemberCounts={groupMemberCounts}
                onSelect={openStudentPage}
                onEditLessons={(s) => setLessonEditorStudent(s)}
                onEditPhones={(s) => setPhoneEditorStudent(s)}
                onManagePayments={(s) => setPaymentHistoryStudent(s)}
                onUpdateStudent={handleUpdateStudent}
                onEditIndividual={(s) => {
                  setEditingIndividual(s);
                  setIndividualModalOpen(true);
                }}
                onDisbandHomeGroup={onDisbandHomeGroup ? handleDisbandHomeGroup : undefined}
              />
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
      {homeGroupOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center"
          onClick={() => {
            if (!homeGroupSaving) setHomeGroupOpen(false);
          }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-group-title"
            className="flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-box border border-hairline bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-hairline px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brass-strong">სახლში</p>
              <h2 id="home-group-title" className="mt-1 text-sm font-bold text-ink">
                სახლის ჯგუფი
              </h2>
              <p className="mt-1 text-[11px] font-medium leading-snug text-muted">
                ერთად მოსული მოსწავლეები კალენდარზე ერთ ჩანაწერად გამოჩნდებიან. გადახდები რჩება ცალ-ცალკე.
              </p>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold text-muted">სახელი</span>
                <input
                  value={homeGroupName}
                  onChange={(e) => setHomeGroupName(e.target.value)}
                  placeholder="მაგ. სამშაბათის ჯგუფი"
                  className="w-full rounded-box border border-hairline bg-searchInput px-3 py-2.5 text-sm font-bold text-searchInputText outline-none focus:border-navy"
                />
              </label>
              <div>
                <p className="mb-1.5 text-[10px] font-bold text-muted">მოსწავლეები</p>
                {ungroupedHomeStudents.length === 0 ? (
                  <p className="rounded-box border border-dashed border-hairline px-3 py-4 text-center text-xs text-muted">
                    ჯგუფის გარეშე სახლის მოსწავლე არ არის
                  </p>
                ) : (
                  <div className="space-y-1">
                    {ungroupedHomeStudents.map((student) => {
                      const checked = homeGroupStudentIds.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-box border px-3 py-2 text-xs font-bold transition-all duration-200 ${
                            checked
                              ? 'border-transparent bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]'
                              : 'border-hairline bg-sectionHeader text-mainText hover:bg-mainButtonHover'
                          }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setHomeGroupStudentIds((current) =>
                                checked ? current.filter((id) => id !== student.id) : [...current, student.id],
                              );
                            }}
                            className="size-3.5 accent-[#465D73]"
                          />
                          <span className="truncate">
                            {student.firstName} {student.lastName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              {homeGroupError ? <p className="text-xs font-bold text-loss">{homeGroupError}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-hairline px-4 py-3">
              <button
                type="button"
                disabled={homeGroupSaving}
                onClick={() => setHomeGroupOpen(false)}
                className="cursor-pointer rounded-box border border-hairline bg-surface px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper-deep disabled:opacity-50">
                გაუქმება
              </button>
              <button
                type="button"
                disabled={homeGroupSaving}
                onClick={handleCreateHomeGroup}
                className="cursor-pointer rounded-box bg-[#A66A32] px-3 py-2 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
                შექმნა
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <IndividualStudentModal
        open={individualModalOpen}
        student={currentEditingIndividual}
        onClose={() => {
          setIndividualModalOpen(false);
          setEditingIndividual(null);
        }}
        onCreate={async (input) => (await onCreateIndividual?.(input)) ?? { ok: false, error: 'Not configured' }}
        onUpdate={async (id, patch) =>
          (await onUpdateIndividual?.(id, patch)) ?? { ok: false, error: 'Not configured' }
        }
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
