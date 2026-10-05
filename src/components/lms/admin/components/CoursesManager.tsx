import { useState, useEffect } from "react";
import { getAdminCourseManagerDataAction } from "@/lib/actions/admin-courses";
import { updateAdminCourseAction } from "@/lib/actions/admin-courses";
import { createAdminCourseAction } from "@/lib/actions/admin-courses";
import { deleteAdminCourseAction } from "@/lib/actions/admin-courses";
import { updateStudentEnrollmentsAction } from "@/lib/actions/admin-courses";
import { Loader2 } from "lucide-react";
import { UserCheck } from "lucide-react";
import { Plus } from "lucide-react";
import { EmptyGroupsState } from "./EmptyGroupsState";
import { AttachStudentsModal } from "./AttachStudentsModal";
import { CourseModal } from "./CourseModal";
import { DeleteGroupModal } from "./DeleteGroupModal";

export function CoursesManager() {
    const [courses, setCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
  
    // კურსის შექმნა/რედაქტირების მოდალი
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: '', title: '', teacherId: '', inviteCode: '' });
  
    // მოსწავლეების მიბმის მოდალი
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [editingStudent, setEditingStudent] = useState<any | null>(null);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
  
    useEffect(() => {
      loadData();
    }, []);
  
    async function loadData() {
      setLoading(true);
      const result = await getAdminCourseManagerDataAction();
      setCourses(result.courses || []);
      setTeachers(result.teachers || []);
      setStudents(result.students || []);
      setLoading(false);
    }
  
    const openCourseModal = (course?: any) => {
      if (course) {
        setFormData({
          id: course.id,
          title: course.title,
          teacherId: course.teacherId || '',
          inviteCode: course.inviteCode || '',
        });
      } else {
        setFormData({
          id: '',
          title: '',
          teacherId: teachers[0]?.id || '',
          inviteCode: '',
        });
      }
      setIsModalOpen(true);
    };
  
    const closeCourseModal = () => {
      setIsModalOpen(false);
      setFormData({ id: '', title: '', teacherId: '', inviteCode: '' });
    };
  
    const handleSaveCourse = async () => {
      if (!formData.title.trim() || !formData.teacherId) return;
      setIsSaving(true);
  
      let res;
      if (formData.id) {
        res = await updateAdminCourseAction(formData.id, {
          title: formData.title,
          teacherId: formData.teacherId,
          inviteCode: formData.inviteCode,
        });
      } else {
        res = await createAdminCourseAction({
          title: formData.title,
          teacherId: formData.teacherId,
          inviteCode: formData.inviteCode,
        });
      }
  
      if (res.success) {
        await loadData();
        closeCourseModal();
      } else {
        alert(res.error || 'შენახვა ვერ მოხერხდა');
      }
      setIsSaving(false);
    };
  
    const handleDeleteCourse = async () => {
      if (!deletingId) return;
      setIsSaving(true);
      const res = await deleteAdminCourseAction(deletingId);
      if (!res.success) alert(res.error);
      await loadData();
      setIsSaving(false);
      setDeletingId(null);
    };
  
    // მოსწავლის კურსების რედაქტირების დაწყება
    const startEditStudentEnrollments = (student: any) => {
      setEditingStudent(student);
      setSelectedCourseIds(student.enrollments.map((e: any) => e.courseId));
    };
  
    // მოსწავლის ჩარიცხვების შენახვა
    const handleSaveStudentEnrollments = async () => {
      if (!editingStudent) return;
      setIsSaving(true);
      const res = await updateStudentEnrollmentsAction(editingStudent.id, selectedCourseIds);
      if (res.success) {
        await loadData();
        setEditingStudent(null);
      } else {
        alert(res.error || 'განახლება ვერ მოხერხდა');
      }
      setIsSaving(false);
    };
  
    const filteredStudents = students.filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()),
    );
  
    if (loading) {
      return (
        <div className="py-20 flex flex-col items-center justify-center text-muted">
          <Loader2 className="size-6 animate-spin text-navy mb-2" />
          <span className="text-sm font-bold">იტვირთება მონაცემები...</span>
        </div>
      );
    }
  
    return (
      <div className="space-y-4">
        {/* ზედა მოქმედებების პანელი */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setIsStudentsModalOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-box bg-[#A66A32] px-4 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)] transition-all duration-200 hover:bg-[#B8783B] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_12px_rgba(166,106,50,0.28)] active:scale-[0.98]">
            <UserCheck className="size-4" />
            მოსწავლეების მართვა & მიბმა ({students.length})
          </button>
  
          <button
            onClick={() => openCourseModal()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-box bg-[#465D73] px-4 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98]">
            <Plus className="size-4" />
            ჯგუფის დამატება
          </button>
        </div>
  
        <EmptyGroupsState
          courses={courses}
          openCourseModal={openCourseModal}
          setDeletingId={setDeletingId}
        />
  
        <AttachStudentsModal
          startEditStudentEnrollments={startEditStudentEnrollments}
          courses={courses}
          selectedCourseIds={selectedCourseIds}
          setSelectedCourseIds={setSelectedCourseIds}
          isSaving={isSaving}
          handleSaveStudentEnrollments={handleSaveStudentEnrollments}
          isStudentsModalOpen={isStudentsModalOpen}
          setIsStudentsModalOpen={setIsStudentsModalOpen}
          editingStudent={editingStudent}
          setEditingStudent={setEditingStudent}
          studentSearch={studentSearch}
          setStudentSearch={setStudentSearch}
          filteredStudents={filteredStudents}
        />
  
        <CourseModal
          isModalOpen={isModalOpen}
          closeCourseModal={closeCourseModal}
          formData={formData}
          setFormData={setFormData}
          isSaving={isSaving}
          teachers={teachers}
          handleSaveCourse={handleSaveCourse}
        />
        <DeleteGroupModal
          deletingId={deletingId}
          setDeletingId={setDeletingId}
          isSaving={isSaving}
          handleDeleteCourse={handleDeleteCourse}
        />
      </div>
    );
  }
