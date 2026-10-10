'use client';

import type { Dispatch, SetStateAction } from 'react';
import { IndividualStudentModal } from '../IndividualStudentModal';
import { LessonEditorModal } from '../LessonEditorModal';
import { PaymentHistoryModal } from '../PaymentHistoryModal';
import { PhoneEditorModal } from '../PhoneEditorModal';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../../studentList.types';
import { HomeGroupModal } from './HomeGroupModal';
import type { StudentListProps } from './types';

interface StudentListModalsProps {
  currentLessonStudent: StudentRecord | null;
  groups: StudentGroup[];
  groupMemberCounts: Record<string, number>;
  setLessonEditorStudent: Dispatch<SetStateAction<StudentRecord | null>>;
  onAddLesson: (input: {
    studentId: string;
    groupId: string;
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    startTime: string;
    endTime: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLesson: (lessonId: string) => Promise<{ ok: boolean; error?: string }>;
  currentPhoneStudent: StudentRecord | null;
  setPhoneEditorStudent: Dispatch<SetStateAction<StudentRecord | null>>;
  onSavePhones: (
    studentId: string,
    phone: string | null,
    parentPhone: string | null,
  ) => Promise<{ ok: boolean; error?: string }>;
  homeGroupOpen: boolean;
  homeGroupSaving: boolean;
  setHomeGroupOpen: Dispatch<SetStateAction<boolean>>;
  homeGroupName: string;
  setHomeGroupName: Dispatch<SetStateAction<string>>;
  ungroupedHomeStudents: StudentRecord[];
  homeGroupStudentIds: string[];
  setHomeGroupStudentIds: Dispatch<SetStateAction<string[]>>;
  homeGroupError: string | null;
  onCreateHomeGroup: () => void;
  individualModalOpen: boolean;
  currentEditingIndividual: StudentRecord | null;
  setIndividualModalOpen: Dispatch<SetStateAction<boolean>>;
  setEditingIndividual: Dispatch<SetStateAction<StudentRecord | null>>;
  onCreateIndividual: StudentListProps['onCreateIndividual'];
  onUpdateIndividual: StudentListProps['onUpdateIndividual'];
  onDeleteIndividual: StudentListProps['onDeleteIndividual'];
  currentPaymentStudent: StudentRecord | null;
  payments: PaymentRecord[];
  setPaymentHistoryStudent: Dispatch<SetStateAction<StudentRecord | null>>;
  onAddPayment: (input: {
    studentId: string;
    amount: number;
    paidAt: string;
    method?: 'cash' | 'card' | 'transfer';
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeletePayment: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateStudent: (id: string, patch: Partial<StudentRecord>) => void;
}

export function StudentListModals({
  currentLessonStudent,
  groups,
  groupMemberCounts,
  setLessonEditorStudent,
  onAddLesson,
  onDeleteLesson,
  currentPhoneStudent,
  setPhoneEditorStudent,
  onSavePhones,
  homeGroupOpen,
  homeGroupSaving,
  setHomeGroupOpen,
  homeGroupName,
  setHomeGroupName,
  ungroupedHomeStudents,
  homeGroupStudentIds,
  setHomeGroupStudentIds,
  homeGroupError,
  onCreateHomeGroup,
  individualModalOpen,
  currentEditingIndividual,
  setIndividualModalOpen,
  setEditingIndividual,
  onCreateIndividual,
  onUpdateIndividual,
  onDeleteIndividual,
  currentPaymentStudent,
  payments,
  setPaymentHistoryStudent,
  onAddPayment,
  onDeletePayment,
  onUpdateStudent,
}: StudentListModalsProps) {
  return (
    <>
      {currentLessonStudent ? (
        <LessonEditorModal
          student={currentLessonStudent}
          groups={groups}
          groupMemberCounts={groupMemberCounts}
          open={true}
          onClose={() => setLessonEditorStudent(null)}
          onAdd={onAddLesson}
          onDelete={onDeleteLesson}
        />
      ) : null}

      {currentPhoneStudent ? (
        <PhoneEditorModal
          student={currentPhoneStudent}
          open={true}
          onClose={() => setPhoneEditorStudent(null)}
          onSave={onSavePhones}
        />
      ) : null}

      {homeGroupOpen ? (
        <HomeGroupModal
          homeGroupSaving={homeGroupSaving}
          setHomeGroupOpen={setHomeGroupOpen}
          homeGroupName={homeGroupName}
          setHomeGroupName={setHomeGroupName}
          ungroupedHomeStudents={ungroupedHomeStudents}
          homeGroupStudentIds={homeGroupStudentIds}
          setHomeGroupStudentIds={setHomeGroupStudentIds}
          homeGroupError={homeGroupError}
          onCreate={onCreateHomeGroup}
        />
      ) : null}

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

      <PaymentHistoryModal
        open={Boolean(currentPaymentStudent)}
        student={currentPaymentStudent}
        payments={payments}
        onClose={() => setPaymentHistoryStudent(null)}
        onAddPayment={onAddPayment}
        onDeletePayment={onDeletePayment}
        onUpdateStudent={onUpdateStudent}
      />
    </>
  );
}
