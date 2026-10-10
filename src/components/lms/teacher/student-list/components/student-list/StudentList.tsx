'use client';

import { localePath } from '@/i18n/config';
import { StudentDetailView } from './StudentDetailView';
import { StudentListBody } from './StudentListBody';
import { StudentListHeader } from './StudentListHeader';
import { StudentListModals } from './StudentListModals';
import type { StudentListProps } from './types';
import { useStudentList } from './useStudentList';

export function StudentList(props: StudentListProps) {
  const list = useStudentList(props);

  if (props.studentId) {
    const student = props.students.find((item) => item.id === props.studentId) ?? null;

    return (
      <StudentDetailView
        student={student}
        onBack={() => list.router.push(localePath(list.locale, '/teacher/student-list'))}
        studentSection={list.studentSection}
        setStudentSection={list.setStudentSection}
        payments={list.payments}
        groups={props.groups}
        groupMemberCounts={list.groupMemberCounts}
        onAddPayment={list.handleAddPaymentForModal}
        onDeletePayment={list.handleDeletePaymentForModal}
        onUpdateStudent={list.handleUpdateStudent}
        onAddLesson={list.handleAddLesson}
        onDeleteLesson={list.handleDeleteLesson}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <StudentListHeader
        view={list.view}
        setView={list.setView}
        isListView={list.isListView}
        setEditingIndividual={list.setEditingIndividual}
        setIndividualModalOpen={list.setIndividualModalOpen}
        setHomeGroupName={list.setHomeGroupName}
        setHomeGroupStudentIds={list.setHomeGroupStudentIds}
        setHomeGroupError={list.setHomeGroupError}
        setHomeGroupOpen={list.setHomeGroupOpen}
        query={list.query}
        setQuery={list.setQuery}
        students={props.students}
        stats={list.stats}
        showTodayOnly={list.showTodayOnly}
        activeGroupId={list.activeGroupId}
        groups={props.groups}
        groupMenuOpen={list.groupMenuOpen}
        setGroupMenuOpen={list.setGroupMenuOpen}
        setActiveGroupId={list.setActiveGroupId}
        setShowTodayOnly={list.setShowTodayOnly}
      />

      <StudentListBody
        view={list.view}
        students={props.students}
        groups={props.groups}
        payments={list.payments}
        monthKey={list.monthKey}
        setMonthKey={list.setMonthKey}
        filtered={list.filtered}
        listSections={list.listSections}
        groupMemberCounts={list.groupMemberCounts}
        openStudentPage={list.openStudentPage}
        setLessonEditorStudent={list.setLessonEditorStudent}
        setPhoneEditorStudent={list.setPhoneEditorStudent}
        setPaymentHistoryStudent={list.setPaymentHistoryStudent}
        handleUpdateStudent={list.handleUpdateStudent}
        setEditingIndividual={list.setEditingIndividual}
        setIndividualModalOpen={list.setIndividualModalOpen}
        onDisbandHomeGroup={props.onDisbandHomeGroup}
        handleDisbandHomeGroup={list.handleDisbandHomeGroup}
      />

      <StudentListModals
        currentLessonStudent={list.currentLessonStudent}
        groups={props.groups}
        groupMemberCounts={list.groupMemberCounts}
        setLessonEditorStudent={list.setLessonEditorStudent}
        onAddLesson={list.handleAddLesson}
        onDeleteLesson={list.handleDeleteLesson}
        currentPhoneStudent={list.currentPhoneStudent}
        setPhoneEditorStudent={list.setPhoneEditorStudent}
        onSavePhones={list.handleSavePhones}
        homeGroupOpen={list.homeGroupOpen}
        homeGroupSaving={list.homeGroupSaving}
        setHomeGroupOpen={list.setHomeGroupOpen}
        homeGroupName={list.homeGroupName}
        setHomeGroupName={list.setHomeGroupName}
        ungroupedHomeStudents={list.ungroupedHomeStudents}
        homeGroupStudentIds={list.homeGroupStudentIds}
        setHomeGroupStudentIds={list.setHomeGroupStudentIds}
        homeGroupError={list.homeGroupError}
        onCreateHomeGroup={list.handleCreateHomeGroup}
        individualModalOpen={list.individualModalOpen}
        currentEditingIndividual={list.currentEditingIndividual}
        setIndividualModalOpen={list.setIndividualModalOpen}
        setEditingIndividual={list.setEditingIndividual}
        onCreateIndividual={props.onCreateIndividual}
        onUpdateIndividual={props.onUpdateIndividual}
        onDeleteIndividual={props.onDeleteIndividual}
        currentPaymentStudent={list.currentPaymentStudent}
        payments={list.payments}
        setPaymentHistoryStudent={list.setPaymentHistoryStudent}
        onAddPayment={list.handleAddPaymentForModal}
        onDeletePayment={list.handleDeletePaymentForModal}
        onUpdateStudent={list.handleUpdateStudent}
      />
    </div>
  );
}
