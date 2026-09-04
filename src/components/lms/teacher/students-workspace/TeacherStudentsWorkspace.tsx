'use client';

import dynamic from 'next/dynamic';
import { Loader2, Users } from 'lucide-react';
import { useTeacherStudentsWorkspace } from './hooks/useTeacherStudentsWorkspace';
import { PageHero } from '@/components/ui/PageHero';
import { TeacherClassesSidebar } from './components/TeacherClassesSidebar';
import { TeacherStudentsHeroAside } from './components/TeacherStudentsHeroAside';
import { TeacherWorkspaceHeader } from './components/TeacherWorkspaceHeader';
import { TeacherWorkspaceTabs } from './components/TeacherWorkspaceTabs';
import { TeacherAssignmentsGrid } from './components/TeacherAssignmentsGrid';
import { AssignProblemModal } from './modals/AssignProblemModal';
import { UploadMaterialModal } from './modals/UploadMaterialModal';
import { PreviewMaterialModal } from './modals/PreviewMaterialModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { TeacherViewProblemModal } from './modals/TeacherViewProblemModal';
import type { TeacherStudentsWorkspaceProps } from './types/teacher-workspace.types';

const ClassroomRoomModal = dynamic(
  () => import('@/components/lms/classroom/ClassroomRoomModal').then((m) => m.ClassroomRoomModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="size-8 animate-spin text-navy" />
      </div>
    ),
  },
);

export function TeacherStudentsWorkspace(props: TeacherStudentsWorkspaceProps) {
  const ws = useTeacherStudentsWorkspace(props);

  return (
    <div className="space-y-6">
      <PageHero
        icon={Users}
        eyebrow="სასწავლო სივრცე"
        title="მოსწავლეების მართვა"
        description="აირჩიეთ მოსწავლე სიიდან, გაუგზავნეთ შენახული ბარათები/ამოცანები და გაუწიეთ უკუკავშირი."
        aside={
          <TeacherStudentsHeroAside
            studentsCount={ws.students.length}
            cardsCount={props.availableSetProblems.length}
            canSendCard={Boolean(ws.activeStudent)}
            onStartClassCall={ws.handleStartClassCall}
            onOpenAssignModal={() => ws.setIsAssignModalOpen(true)}
          />
        }
      />

      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
        <TeacherClassesSidebar
          courses={ws.courses}
          filteredCourses={ws.filteredCourses}
          activeCourseId={ws.activeCourseId}
          classSearchQuery={ws.classSearchQuery}
          setClassSearchQuery={ws.setClassSearchQuery}
          handleCourseChange={ws.handleCourseChange}
          studentsCount={ws.students.length}
          students={ws.students}
        />

        {/* 2. მარჯვენა მხარე: სამუშაო სივრცე */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-paper shadow-sm overflow-hidden">
          <TeacherWorkspaceHeader
            studentsInActiveCourse={ws.studentsInActiveCourse}
            selectedStudentId={ws.selectedStudentId}
            unreadStudentIds={ws.unreadStudentIds}
            onSelectStudent={ws.handleStudentSelect}
            activeStudent={ws.activeStudent}
            selectedDateKey={ws.selectedDateKey}
            setSelectedDateKey={ws.setSelectedDateKey}
            onShiftDate={ws.handleShiftDate}
          />

          <TeacherWorkspaceTabs
            activeTab={ws.activeTab}
            setActiveTab={ws.setActiveTab}
            tasksCount={ws.tasksCountForDate}
            answersCount={ws.answersCountForDate}
            materialsCount={ws.materialsCountForDate}
            activeStudent={ws.activeStudent}
            onOpenUploadMaterial={() => ws.setIsMaterialModalOpen(true)}
          />

          <TeacherAssignmentsGrid
            activeStudent={ws.activeStudent}
            activeTab={ws.activeTab}
            assignments={ws.filteredTabAssignments}
            formattedSelectedDate={ws.formattedSelectedDate}
            onOpenMaterialModal={() => ws.setIsMaterialModalOpen(true)}
            onSelectAssignment={(assignment, mode) =>
              ws.setActiveAssignmentModal({
                assignment,
                studentName: ws.activeStudent?.name || '',
                mode,
              })
            }
            onPreviewMaterial={(material) => ws.setPreviewMaterialModal(material)}
            onDeleteAssignment={(id) => ws.setDeletingAssignmentId(id)}
          />
        </section>
      </div>

      {/* --- მოდალები --- */}
      {ws.activeVideoCallCourse && (
        <ClassroomRoomModal
          courseId={ws.activeVideoCallCourse.id}
          courseTitle={ws.activeVideoCallCourse.title}
          onClose={() => ws.setActiveVideoCallCourse(null)}
          isTeacher={true}
        />
      )}

      {ws.isAssignModalOpen && ws.activeStudent && (
        <AssignProblemModal
          activeStudent={ws.activeStudent}
          availableSetProblems={props.availableSetProblems}
          onClose={() => ws.setIsAssignModalOpen(false)}
          onSuccess={ws.handleAssignmentCreated}
        />
      )}

      {ws.isMaterialModalOpen && ws.activeStudent && (
        <UploadMaterialModal
          activeStudent={ws.activeStudent}
          onClose={() => ws.setIsMaterialModalOpen(false)}
          onSuccess={ws.handleMaterialUploaded}
        />
      )}

      {ws.activeAssignmentModal && (
        <TeacherViewProblemModal
          assignment={ws.activeAssignmentModal.assignment}
          studentName={ws.activeAssignmentModal.studentName}
          mode={ws.activeAssignmentModal.mode}
          onClose={() => ws.setActiveAssignmentModal(null)}
        />
      )}

      {ws.previewMaterialModal && (
        <PreviewMaterialModal
          material={ws.previewMaterialModal}
          onClose={() => ws.setPreviewMaterialModal(null)}
        />
      )}

      {ws.deletingAssignmentId && (
        <DeleteConfirmModal
          isDeleting={ws.isDeleting}
          onCancel={() => ws.setDeletingAssignmentId(null)}
          onConfirm={ws.handleConfirmDelete}
        />
      )}
    </div>
  );
}