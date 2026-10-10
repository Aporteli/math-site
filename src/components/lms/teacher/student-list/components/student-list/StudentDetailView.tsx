'use client';

import { LessonEditorModal } from '../LessonEditorModal';
import { PaymentHistoryModal } from '../PaymentHistoryModal';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../../studentList.types';
import { StudentSectionToggle } from './StudentSectionToggle';
import type { StudentSection } from './types';

interface StudentDetailViewProps {
  student: StudentRecord | null;
  onBack: () => void;
  studentSection: StudentSection;
  setStudentSection: (section: StudentSection) => void;
  payments: PaymentRecord[];
  groups: StudentGroup[];
  groupMemberCounts: Record<string, number>;
  onAddPayment: (
    input: {
      studentId: string;
      amount: number;
      paidAt: string;
      method?: 'cash' | 'card' | 'transfer';
      note?: string;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeletePayment: (paymentId: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateStudent: (id: string, patch: Partial<StudentRecord>) => void;
  onAddLesson: (input: {
    studentId: string;
    groupId: string;
    dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    startTime: string;
    endTime: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLesson: (lessonId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function StudentDetailView({
  student,
  onBack,
  studentSection,
  setStudentSection,
  payments,
  groups,
  groupMemberCounts,
  onAddPayment,
  onDeletePayment,
  onUpdateStudent,
  onAddLesson,
  onDeleteLesson,
}: StudentDetailViewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer rounded-box border border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-ink transition-all duration-200 hover:bg-paper-deep active:scale-[0.98]">
            უკან
          </button>
          <p className="truncate text-sm font-bold text-ink">
            {student ? `${student.firstName} ${student.lastName}` : 'მოსწავლე ვერ მოიძებნა'}
          </p>
        </div>
        <StudentSectionToggle studentSection={studentSection} onChange={setStudentSection} />
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
              onAddPayment={onAddPayment}
              onDeletePayment={onDeletePayment}
              onUpdateStudent={onUpdateStudent}
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
              onAdd={onAddLesson}
              onDelete={onDeleteLesson}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
