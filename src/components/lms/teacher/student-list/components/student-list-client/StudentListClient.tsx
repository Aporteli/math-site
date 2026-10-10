'use client';

import { StudentList } from '../student-list/StudentList';
import type { StudentListClientProps } from './types';
import { useStudentListClient } from './useStudentListClient';

export function StudentListClient(props: StudentListClientProps) {
  const {
    students,
    groupList,
    payments,
    handleUpdateStudent,
    handleUpdatePayments,
    handleUpdatePhones,
    handleCreateIndividual,
    handleUpdateIndividual,
    handleDeleteIndividual,
    handleAddGroupPayment,
    handleDeleteGroupPayment,
    handleAddIndividualPayment,
    handleDeleteIndividualPayment,
    handleToggleMissed,
    handleCreateHomeGroup,
    handleDisbandHomeGroup,
  } = useStudentListClient(props);

  return (
    <div className="min-w-0">
      <StudentList
        studentId={props.studentId}
        students={students}
        groups={groupList}
        onCreateHomeGroup={handleCreateHomeGroup}
        onDisbandHomeGroup={handleDisbandHomeGroup}
        initialPayments={payments}
        onUpdateStudent={handleUpdateStudent}
        onUpdatePayments={handleUpdatePayments}
        onUpdatePhones={handleUpdatePhones}
        onCreateIndividual={handleCreateIndividual}
        onUpdateIndividual={handleUpdateIndividual}
        onDeleteIndividual={handleDeleteIndividual}
        onAddGroupPayment={handleAddGroupPayment}
        onDeleteGroupPayment={handleDeleteGroupPayment}
        onAddIndividualPayment={handleAddIndividualPayment}
        onDeleteIndividualPayment={handleDeleteIndividualPayment}
        onToggleMissed={handleToggleMissed}
      />
    </div>
  );
}
