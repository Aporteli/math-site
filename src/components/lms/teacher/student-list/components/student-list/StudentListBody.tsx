'use client';

import type { Dispatch, SetStateAction } from 'react';
import { DebtTracker } from '../DebtTracker';
import { ReportsView } from '../report-view/ReportsView';
import { StudentListTable } from '../StudentListTable';
import type { StudentListSection } from '../../studentList.helpers';
import type { PaymentRecord, StudentGroup, StudentRecord } from '../../studentList.types';
import { StudentListEmpty } from './StudentListEmpty';
import type { StudentListProps, StudentListView } from './types';

interface StudentListBodyProps {
  view: StudentListView;
  students: StudentRecord[];
  groups: StudentGroup[];
  payments: PaymentRecord[];
  monthKey: string;
  setMonthKey: Dispatch<SetStateAction<string>>;
  filtered: StudentRecord[];
  listSections: StudentListSection[];
  groupMemberCounts: Record<string, number>;
  openStudentPage: (student: StudentRecord) => void;
  setLessonEditorStudent: Dispatch<SetStateAction<StudentRecord | null>>;
  setPhoneEditorStudent: Dispatch<SetStateAction<StudentRecord | null>>;
  setPaymentHistoryStudent: Dispatch<SetStateAction<StudentRecord | null>>;
  handleUpdateStudent: (id: string, patch: Partial<StudentRecord>) => void;
  setEditingIndividual: Dispatch<SetStateAction<StudentRecord | null>>;
  setIndividualModalOpen: Dispatch<SetStateAction<boolean>>;
  onDisbandHomeGroup: StudentListProps['onDisbandHomeGroup'];
  handleDisbandHomeGroup: (groupId: string) => void;
}

export function StudentListBody({
  view,
  students,
  groups,
  payments,
  monthKey,
  setMonthKey,
  filtered,
  listSections,
  groupMemberCounts,
  openStudentPage,
  setLessonEditorStudent,
  setPhoneEditorStudent,
  setPaymentHistoryStudent,
  handleUpdateStudent,
  setEditingIndividual,
  setIndividualModalOpen,
  onDisbandHomeGroup,
  handleDisbandHomeGroup,
}: StudentListBodyProps) {
  if (view === 'debt') {
    return (
      <DebtTracker
        students={students}
        groups={groups}
        payments={payments}
        monthKey={monthKey}
        onMonthChange={setMonthKey}
        onManagePayments={(s) => setPaymentHistoryStudent(s)}
        onEditPhones={(s) => setPhoneEditorStudent(s)}
      />
    );
  }

  if (view === 'reports') {
    return (
      <ReportsView
        students={students}
        groups={groups}
        payments={payments}
        monthKey={monthKey}
        onMonthChange={setMonthKey}
      />
    );
  }

  return (
    <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
      {filtered.length === 0 ? (
        <StudentListEmpty />
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
  );
}
