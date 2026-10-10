'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { sectionStudents } from '../../studentList.helpers';
import { getMonthKey } from '../../paymentCalendar.helpers';
import type { PaymentRecord, StudentRecord } from '../../studentList.types';
import { defaultLocale, isLocale, localePath } from '@/i18n/config';
import { buildListStats } from './buildListStats';
import { countGroupMembers } from './countGroupMembers';
import { filterStudents } from './filterStudents';
import { disbandHomeGroup, submitHomeGroup } from './homeGroupHandlers';
import { addStudentLesson, deleteStudentLesson } from './lessonHandlers';
import { addPaymentForModal, deletePaymentForModal } from './paymentHandlers';
import { saveStudentPhones } from './phoneHandlers';
import { resolveFreshStudent } from './resolveFreshStudent';
import type { LessonInput, PaymentInput, StudentListProps, StudentListView, StudentSection } from './types';

export function useStudentList({
  students,
  groups,
  initialPayments = [],
  onUpdateStudent,
  onUpdatePhones,
  onCreateHomeGroup,
  onDisbandHomeGroup,
  onAddGroupPayment,
  onDeleteGroupPayment,
  onAddIndividualPayment,
  onDeleteIndividualPayment,
}: StudentListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const localeSegment = pathname.split('/')[1] ?? '';
  const locale = isLocale(localeSegment) ? localeSegment : defaultLocale;

  const [view, setView] = useState<StudentListView>('table');
  const [studentSection, setStudentSection] = useState<StudentSection>('pricing');
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

  const currentPaymentStudent = useMemo(
    () => resolveFreshStudent(paymentHistoryStudent, students),
    [paymentHistoryStudent, students],
  );

  const currentEditingIndividual = useMemo(
    () => resolveFreshStudent(editingIndividual, students),
    [editingIndividual, students],
  );

  const currentLessonStudent = useMemo(
    () => resolveFreshStudent(lessonEditorStudent, students),
    [lessonEditorStudent, students],
  );

  const currentPhoneStudent = useMemo(
    () => resolveFreshStudent(phoneEditorStudent, students),
    [phoneEditorStudent, students],
  );

  const handleUpdateStudent = (id: string, patch: Partial<StudentRecord>) => {
    onUpdateStudent?.(id, patch);
  };

  const handleAddPaymentForModal = (input: PaymentInput) =>
    addPaymentForModal(input, students, onAddIndividualPayment, onAddGroupPayment);

  const handleDeletePaymentForModal = (paymentId: string) =>
    deletePaymentForModal(paymentId, payments, students, onDeleteIndividualPayment, onDeleteGroupPayment);

  const handleAddLesson = (input: LessonInput) =>
    addStudentLesson(input, {
      students,
      studentsRef,
      updateStudent: handleUpdateStudent,
    });

  const handleDeleteLesson = (lessonId: string) =>
    deleteStudentLesson(lessonId, {
      students,
      studentsRef,
      updateStudent: handleUpdateStudent,
    });

  const handleDisbandHomeGroup = (groupId: string) => disbandHomeGroup(groupId, groups, onDisbandHomeGroup);

  const ungroupedHomeStudents = students.filter((s) => s.kind === 'individual' && !s.homeGroupId);

  const handleCreateHomeGroup = () =>
    submitHomeGroup({
      homeGroupName,
      homeGroupStudentIds,
      onCreateHomeGroup,
      setHomeGroupError,
      setHomeGroupSaving,
      setHomeGroupOpen,
      setHomeGroupName,
      setHomeGroupStudentIds,
    });

  const handleSavePhones = (studentId: string, phone: string | null, parentPhone: string | null) =>
    saveStudentPhones(studentId, phone, parentPhone, onUpdatePhones);

  const today = new Date();
  const todayDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

  const filtered = useMemo(
    () => filterStudents(students, query, activeGroupId, showTodayOnly, todayDayOfWeek),
    [students, query, activeGroupId, showTodayOnly, todayDayOfWeek],
  );

  const listSections = useMemo(
    () => sectionStudents(filtered, groups, activeGroupId === 'all' ? undefined : activeGroupId),
    [filtered, groups, activeGroupId],
  );

  const groupMemberCounts = useMemo(() => countGroupMembers(students, groups), [students, groups]);

  const stats = useMemo(() => buildListStats(students, payments, monthKey), [students, payments, monthKey]);

  const isListView = view === 'table';

  const openStudentPage = (student: StudentRecord) => {
    router.push(localePath(locale, `/teacher/student-list/${student.id}`));
  };

  return {
    router,
    locale,
    view,
    setView,
    studentSection,
    setStudentSection,
    query,
    setQuery,
    activeGroupId,
    setActiveGroupId,
    monthKey,
    setMonthKey,
    payments,
    setLessonEditorStudent,
    setPhoneEditorStudent,
    individualModalOpen,
    setIndividualModalOpen,
    homeGroupOpen,
    setHomeGroupOpen,
    homeGroupName,
    setHomeGroupName,
    homeGroupStudentIds,
    setHomeGroupStudentIds,
    homeGroupError,
    setHomeGroupError,
    homeGroupSaving,
    setEditingIndividual,
    setPaymentHistoryStudent,
    showTodayOnly,
    setShowTodayOnly,
    groupMenuOpen,
    setGroupMenuOpen,
    currentPaymentStudent,
    currentEditingIndividual,
    currentLessonStudent,
    currentPhoneStudent,
    handleUpdateStudent,
    handleAddPaymentForModal,
    handleDeletePaymentForModal,
    handleAddLesson,
    handleDeleteLesson,
    handleDisbandHomeGroup,
    ungroupedHomeStudents,
    handleCreateHomeGroup,
    handleSavePhones,
    filtered,
    listSections,
    groupMemberCounts,
    stats,
    isListView,
    openStudentPage,
  };
}
