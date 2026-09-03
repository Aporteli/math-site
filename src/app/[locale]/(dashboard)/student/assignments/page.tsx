'use client';

import { Calendar as CalendarIcon, ClipboardList } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { PageHero } from '@/components/ui/PageHero';
import { ProblemDetailModal } from '@/components/lms/student/assignments/components/ProblemDetailModal';

// კომპონენტები components/student/assignments/ დირექტორიიდან
import { AssignmentAnswersTab } from '@/components/lms/student/assignments/components/AssignmentAnswersTab';
import { AssignmentContentTabsHeader } from '@/components/lms/student/assignments/components/AssignmentContentTabsHeader';
import { AssignmentDatePickerHeader } from '@/components/lms/student/assignments/components/AssignmentDatePickerHeader';
import { AssignmentFiltersSidebar } from '@/components/lms/student/assignments/components/AssignmentFiltersSidebar';
import { AssignmentGroupUploader } from '@/components/lms/student/assignments/components/AssignmentGroupUploader';
import { AssignmentMaterialsTab } from '@/components/lms/student/assignments/components/AssignmentMaterialsTab';
import { AssignmentTasksTab } from '@/components/lms/student/assignments/components/AssignmentTasksTab';
import { MaterialPreviewModal } from '@/components/lms/student/assignments/components/MaterialPreviewModal';
import { StudentAssignmentsHeroAside } from '@/components/lms/student/assignments/components/StudentAssignmentsHeroAside';

// ჰუკი components/student/hooks/ დირექტორიიდან
import { useStudentAssignments } from '@/components/lms/student/assignments/hooks/useStudentAssignments';

interface StudentAssignmentsProps {
  locale: Locale;
}

export default function StudentAssignments({ locale }: StudentAssignmentsProps) {
  const {
    copy,
    courses,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    loading,
    selectedDateKey,
    setSelectedDateKey,
    handleShiftDate,
    formattedSelectedDate,
    taskAssignments,
    submittedAnswersForDate,
    materialsForDate,
    todayAssignments,
    handleGroupFileUpload,
    removeGroupAttachment,
    handleSubmitDateGroup,
    handleResetDateGroup,
    currentGroupFiles,
    isUploading,
    isSubmitting,
    isWithdrawing,
    isGroupAlreadySubmitted,
    activeProblemModal,
    setActiveProblemModal,
    previewMaterialModal,
    setPreviewMaterialModal,
    assignments,
  } = useStudentAssignments(locale);

  return (
    <div className="space-y-6">
      <PageHero
        icon={ClipboardList}
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        aside={
          <StudentAssignmentsHeroAside
            todayAssignmentsCount={todayAssignments.length}
            isGroupAlreadySubmitted={isGroupAlreadySubmitted}
            courses={courses}
          />
        }
      />

      {/* ─── მთავარი სამუშაო სივრცე: ფილტრები და კონტენტი ─── */}
      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
        {/* სვეტი 1: ფილტრები */}
        <AssignmentFiltersSidebar statusFilter={statusFilter} onFilterChange={setStatusFilter} />

        {/* სვეტი 2: მოსწავლის სამუშაო სივრცე */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white shadow-sm overflow-hidden">
          {/* ზედა ზოლი 1: სათაური და კალენდარი */}
          <AssignmentDatePickerHeader
            tasksCount={taskAssignments.length}
            selectedDateKey={selectedDateKey}
            onShiftDate={handleShiftDate}
            onDateChange={setSelectedDateKey}
          />

          {/* ზედა ზოლი 2: სამი საკონტროლო ტაბი */}
          <AssignmentContentTabsHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tasksCount={taskAssignments.length}
            answersCount={submittedAnswersForDate.length}
            materialsCount={materialsForDate.length}
            formattedSelectedDate={formattedSelectedDate}
          />

          <div className="flex-1 flex flex-col min-h-0 bg-paper">
            {/* 1. დავალებების ტაბი */}
            {activeTab === 'tasks' && (
              <AssignmentTasksTab
                loading={loading}
                taskAssignments={taskAssignments}
                formattedSelectedDate={formattedSelectedDate}
                onSelectProblem={setActiveProblemModal}
              />
            )}

            {/* 2. პასუხების ტაბი */}
            {activeTab === 'answers' && (
              <AssignmentAnswersTab answers={submittedAnswersForDate} onPreviewAnswer={setPreviewMaterialModal} />
            )}

            {/* 3. მასალების ტაბი */}
            {activeTab === 'materials' && (
              <AssignmentMaterialsTab
                materialsForDate={materialsForDate}
                setPreviewMaterialModal={setPreviewMaterialModal}
                setActiveProblemModal={setActiveProblemModal}
              />
            )}

            {/* ქვედა ნაწილი: ძირში ფიქსირებული პასუხების მიმაგრების პანელი */}
            {activeTab === 'tasks' && (
              <AssignmentGroupUploader
                selectedDateKey={selectedDateKey}
                taskAssignments={taskAssignments}
                isGroupAlreadySubmitted={isGroupAlreadySubmitted}
                isWithdrawing={isWithdrawing}
                isUploading={isUploading}
                isSubmitting={isSubmitting}
                currentGroupFiles={currentGroupFiles}
                onResetGroup={handleResetDateGroup}
                onFileUpload={handleGroupFileUpload}
                onSubmitGroup={handleSubmitDateGroup}
                onRemoveAttachment={removeGroupAttachment}
              />
            )}
          </div>
        </section>
      </div>

      {/* ამოცანის მოდალი */}
      {activeProblemModal && (
        <ProblemDetailModal
          problem={activeProblemModal.problem}
          assignmentTitle={assignments.find((a) => a.id === activeProblemModal.assignmentId)?.title || 'დავალება'}
          onClose={() => setActiveProblemModal(null)}
        />
      )}

      {/* მასალის/პასუხის ნახვის მოდალი — შესაბამისი აიკონით ჰედერში */}
      {previewMaterialModal && (
        <MaterialPreviewModal modal={previewMaterialModal} onClose={() => setPreviewMaterialModal(null)} />
      )}
    </div>
  );
}
