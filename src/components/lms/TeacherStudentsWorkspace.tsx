'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Users,
  Search,
  BookOpen,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar as CalendarIcon,
  MessageSquare,
  Plus,
  Send,
  X,
  Check,
  CheckCircle2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Video,
  ImageIcon,
} from 'lucide-react';
import { deleteTargetedAssignmentAction, getProblemDetailsAction, markAssignmentGradedAction } from '@/lib/actions/teacher-students';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import { TeacherViewProblemModal } from '@/components/lms/teacher/TeacherViewProblemModal';
import { KatexPreview } from '@/components/math/katex-preview';
const ClassroomRoomModal = dynamic(
  () => import('@/components/lms/classroom/ClassroomRoomModal').then((m) => m.ClassroomRoomModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <Loader2 className="size-8 animate-spin text-white" />
      </div>
    ),
  },
);

interface StudentAssignment {
  id: string;
  submissionId?: string;
  title: string;
  type: string;
  instructions?: string | null;
  status: string;
  createdAt: string;
  promptTex?: string;
  problemImageUrl?: string | null;
  studentAttachmentUrl?: string | null;
  commentCount: number;
}

interface StudentItem {
  id: string;
  name: string;
  email?: string;
  imageUrl?: string | null;
  courses: { id: string; title: string }[];
  assignments: StudentAssignment[];
}

interface SetProblem {
  id: string;
  setId: string;
  setTitle: string;
  title: string;
}

interface TeacherStudentsWorkspaceProps {
  initialStudents: StudentItem[];
  courses: { id: string; title: string }[];
  availableSetProblems: SetProblem[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

function formatDateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ახალი გასაღები, რათა ძველი არასწორი ქეში გაიწმინდოს
const STORAGE_KEY = 'mathlab_teacher_viewed_assignments_v1';

export function TeacherStudentsWorkspace({
  initialStudents = [],
  courses = [],
  availableSetProblems = [],
}: TeacherStudentsWorkspaceProps) {
  const [students, setStudents] = useState<StudentItem[]>(initialStudents);
  const [activeCourseId, setActiveCourseId] = useState<string | 'all'>('all');
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateToKey(new Date()));

  // Hydration დაცვა: სანამ LocalStorage არ წაიკითხება, ბურთულებს არ ვაჩვენებთ
  const [isReady, setIsReady] = useState(false);
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setViewedKeys(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to read viewed keys from localStorage', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeAssignmentModal, setActiveAssignmentModal] = useState<{
    assignment: StudentAssignment;
    studentName: string;
  } | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState<string>('custom');
  const [customTitle, setCustomTitle] = useState('თავისუფალი დავალება');
  
  const [assignComment, setAssignComment] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [problemSearchQuery, setProblemSearchQuery] = useState('');

  const [selectedProblemDetails, setSelectedProblemDetails] = useState<{
    promptTex: string;
    solutionTex: string;
  } | null>(null);
  const [loadingProblemDetails, setLoadingProblemDetails] = useState(false);

  const [assignImage, setAssignImage] = useState<string | null>(null);
  const [assignImageName, setAssignImageName] = useState<string | null>(null);
  const assignFileRef = useRef<HTMLInputElement>(null);

  const [activeVideoCallCourse, setActiveVideoCallCourse] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const isAnyModalOpen = Boolean(
    deletingAssignmentId || activeAssignmentModal || isAssignModalOpen || activeVideoCallCourse,
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [isAnyModalOpen]);

  // ბარათის პირობის/ამოხსნის ლაზური ჩატვირთვა — მხოლოდ არჩევისას
  useEffect(() => {
    if (selectedProblemId === 'custom') {
      setSelectedProblemDetails(null);
      setLoadingProblemDetails(false);
      return;
    }

    let cancelled = false;
    setLoadingProblemDetails(true);
    setSelectedProblemDetails(null);

    getProblemDetailsAction(selectedProblemId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSelectedProblemDetails({
            promptTex: res.promptTex ?? '',
            solutionTex: res.solutionTex ?? '',
          });
        }
        setLoadingProblemDetails(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingProblemDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProblemId]);

  const filteredCourses = useMemo(
    () => courses.filter((c) => c.title.toLowerCase().includes(classSearchQuery.toLowerCase())),
    [courses, classSearchQuery],
  );

  const studentsInActiveCourse = useMemo(
    () =>
      students.filter((s) =>
        activeCourseId === 'all' ? true : s.courses.some((c) => c.id === activeCourseId),
      ),
    [students, activeCourseId],
  );

  const activeStudent = students.find((s) => s.id === selectedStudentId);
  const selectedCourseObj = courses.find((c) => c.id === activeCourseId);

  const studentAvailableDates = useMemo(() => {
    if (!activeStudent || !activeStudent.assignments) return [];
    const set = new Set<string>();
    activeStudent.assignments.forEach((a) => {
      const key = formatDateToKey(new Date(a.createdAt));
      set.add(key);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [activeStudent]);

  useEffect(() => {
    if (studentAvailableDates.length > 0) {
      const todayKey = formatDateToKey(new Date());
      if (!studentAvailableDates.includes(todayKey)) {
        setSelectedDateKey(studentAvailableDates[0]);
      }
    }
  }, [studentAvailableDates]);

  // მოსწავლეები, რომლებსაც გაუხსნელი (წაუკითხავი) დავალება აქვთ — წინასწარ გამოითვლება
  const unreadStudentIds = useMemo(() => {
    if (!isReady) return new Set<string>();
    const ids = new Set<string>();
    for (const student of students) {
      const hasUnread = student.assignments.some((a) => {
        const isSubmitted =
          (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) &&
          a.status !== 'GRADED';
        return isSubmitted && !viewedKeys.has(a.id);
      });
      if (hasUnread) ids.add(student.id);
    }
    return ids;
  }, [students, viewedKeys, isReady]);

  const assignmentsForSelectedDate = useMemo(() => {
    if (!activeStudent || !activeStudent.assignments) return [];
    return activeStudent.assignments.filter((assignment) => {
      const dateKey = formatDateToKey(new Date(assignment.createdAt));
      return dateKey === selectedDateKey;
    });
  }, [activeStudent, selectedDateKey]);

  const handleShiftDate = (days: number) => {
    const parts = selectedDateKey.split('-');
    const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    current.setDate(current.getDate() + days);
    setSelectedDateKey(formatDateToKey(current));
  };

  const formattedSelectedDate = useMemo(() => {
    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDateKey]);

  const selectedProblem = availableSetProblems.find((p) => p.id === selectedProblemId);
  const filteredSetProblems = useMemo(
    () =>
      availableSetProblems.filter(
        (p) =>
          p.title.toLowerCase().includes(problemSearchQuery.toLowerCase()) ||
          p.setTitle.toLowerCase().includes(problemSearchQuery.toLowerCase()),
      ),
    [availableSetProblems, problemSearchQuery],
  );

  const handleCourseChange = (courseId: string) => {
    setActiveCourseId(courseId);
    setSelectedStudentId(null);
  };

  // როცა მასწავლებელი ირჩევს მოსწავლეს, ყველა მისი ამჟამად გაუხსნელი დავალება ინიშნება წაკითხულად
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    
    const student = students.find((s) => s.id === studentId);
    if (student) {
      const newUnreadIds = student.assignments.filter((a) => {
        const isSub = (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) && a.status !== 'GRADED';
        return isSub && !viewedKeys.has(a.id);
      }).map(a => a.id);

      if (newUnreadIds.length > 0) {
        setViewedKeys((prev) => {
          const next = new Set(prev);
          newUnreadIds.forEach(id => next.add(id));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
          } catch (e) {}
          return next;
        });
      }
    }
  };

  async function handleConfirmDelete() {
    if (!deletingAssignmentId) return;

    setIsDeleting(true);
    const res = await deleteTargetedAssignmentAction(deletingAssignmentId);
    setIsDeleting(false);

    if (res.success) {
      setStudents((prev) =>
        prev.map((student) => ({
          ...student,
          assignments: student.assignments.filter((a) => a.id !== deletingAssignmentId),
        })),
      );
      setDeletingAssignmentId(null);
    } else {
      alert(res.error || 'წაშლა ვერ მოხერხდა');
    }
  }

  async function handleMarkAsGraded(assignment: StudentAssignment) {
    const targetId = assignment.submissionId || assignment.id;
    await markAssignmentGradedAction(targetId);

    setStudents((prev) =>
      prev.map((student) =>
        student.id === activeStudent?.id
          ? {
              ...student,
              assignments: student.assignments.map((a) => (a.id === assignment.id ? { ...a, status: 'GRADED' } : a)),
            }
          : student,
      ),
    );
  }

  async function handleSendProblemToStudent() {
    if (!activeStudent) return;

    const safeTitle = (customTitle ?? '').trim() || 'თავისუფალი დავალება';
    const safeComment = (assignComment ?? '').trim();

    let problemData;

    if (selectedProblemId === 'custom') {
      problemData = {
        id: 'custom-' + Date.now(),
        topic: safeTitle,
        difficulty: 'medium',
        promptTex: '',
        solutionTex: '',
      };
    } else {
      const prob = availableSetProblems.find((p) => p.id === selectedProblemId);
      if (!prob || !selectedProblemDetails) return;
      problemData = {
        id: prob.id,
        topic: prob.title,
        difficulty: 'medium',
        promptTex: selectedProblemDetails.promptTex || '',
        solutionTex: selectedProblemDetails.solutionTex || '',
      };
    }

    setAssigning(true);

    try {
      const res = await sendProblemToStudentAction({
        studentId: activeStudent.id,
        instructions: safeComment || undefined,
        attachmentUrl: assignImage || null,
        problem: problemData,
      });

      if (res.success) {
        const newAssignment: StudentAssignment = {
          id: res.assignmentId || 'temp-' + Date.now(),
          title: problemData.topic,
          type: 'PROBLEM',
          instructions: safeComment || null,
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          promptTex: problemData.promptTex,
          problemImageUrl: assignImage,
          studentAttachmentUrl: null,
          commentCount: safeComment ? 1 : 0,
        };

        setStudents((prev) =>
          prev.map((s) => (s.id === activeStudent.id ? { ...s, assignments: [newAssignment, ...s.assignments] } : s)),
        );
        setSelectedDateKey(formatDateToKey(new Date()));
        setIsAssignModalOpen(false);
        setAssignComment('');
        setCustomTitle('თავისუფალი დავალება');
        setAssignImage(null);
        setAssignImageName(null);
        setProblemSearchQuery('');
      } else {
        alert('გაგზავნა ვერ მოხერხდა: ' + (res.error || 'უცნობი შეცდომა'));
      }
    } catch (error) {
      console.error(error);
      alert('დაფიქსირდა შეცდომა დავალების გაგზავნისას.');
    } finally {
      setAssigning(false);
    }
  }

  const handleStartClassCall = () => {
    if (activeCourseId !== 'all') {
      const currentCourse = courses.find((c) => c.id === activeCourseId);
      if (currentCourse) {
        setActiveVideoCallCourse(currentCourse);
      }
    } else if (courses.length > 0) {
      setActiveVideoCallCourse(courses[0]);
    } else {
      alert('ვიდეო გაკვეთილის დასაწყებად საჭიროა მინიმუმ ერთი აქტიური კლასი.');
    }
  };

  const isSendDisabled =
    assigning ||
    (selectedProblemId === 'custom' && !assignImage && !(assignComment ?? '').trim()) ||
    (selectedProblemId !== 'custom' &&
      (!selectedProblem || loadingProblemDetails || !selectedProblemDetails));

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
        {/* სვეტი 1: კლასები */}
        <aside className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <GraduationCap className="size-4 text-navy" />
            <h3 className="text-sm font-bold text-ink">კლასები</h3>
            <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-bold text-muted">
              {courses.length}
            </span>
          </div>

          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
            <input
              type="text"
              value={classSearchQuery}
              onChange={(e) => setClassSearchQuery(e.target.value)}
              placeholder="მოძებნეთ კლასი..."
              className="w-full rounded-xl border border-hairline bg-paper py-2 pl-9 pr-3 text-xs font-medium text-ink outline-none focus:border-navy"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pe-0.5 custom-scrollbar">
            {/* 1. ყველა მოსწავლე (წერტილის გარეშე) */}
            <button
              type="button"
              onClick={() => handleCourseChange('all')}
              className={`flex w-full items-center justify-between gap-2.5 rounded-2xl p-3 text-left transition-all ${
                activeCourseId === 'all'
                  ? 'bg-navy text-white shadow-sm ring-1 ring-navy'
                  : 'bg-paper/40 hover:bg-paper-deep text-ink'
              }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    activeCourseId === 'all' ? 'bg-white text-navy' : 'bg-navy text-white'
                  }`}>
                  <Users className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">ყველა მოსწავლე</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                  activeCourseId === 'all' ? 'bg-white/20 text-white' : 'bg-white border border-hairline text-muted'
                }`}>
                {students.length}
              </span>
            </button>

            {/* 2. ჯგუფები / კლასები */}
            {filteredCourses.map((course) => {
              const active = course.id === activeCourseId;
              const courseStudents = students.filter((s) => s.courses.some((c) => c.id === course.id));
              const courseHasUnread = courseStudents.some((s) => unreadStudentIds.has(s.id));

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleCourseChange(course.id)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-2xl p-3 text-left transition-all ${
                    active
                      ? 'bg-navy text-white shadow-sm ring-1 ring-navy'
                      : 'bg-paper/40 hover:bg-paper-deep text-ink'
                  }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        active ? 'bg-white text-navy' : 'bg-navy text-white'
                      }`}>
                      {course.title.charAt(0)}
                      {courseHasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{course.title}</p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-white border border-hairline text-muted'
                    }`}>
                    {courseStudents.length}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* სვეტი 2: მოსწავლეების ტაბები და სამუშაო დაფა */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white shadow-sm overflow-hidden">
          {/* ზედა ტაბების ზოლი */}
          <div className="bg-paper/30 border-b border-hairline pt-2 px-2 overflow-x-auto flex custom-scrollbar">
            {studentsInActiveCourse.length === 0 ? (
              <p className="py-3 px-4 text-xs font-bold text-muted">ამ კლასში მოსწავლეები არ არიან</p>
            ) : (
              studentsInActiveCourse.map((student) => {
                const isSelected = selectedStudentId === student.id;
                const hasUnread = unreadStudentIds.has(student.id);

                return (
                  <button
                    key={student.id}
                    onClick={() => handleStudentSelect(student.id)}
                    className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 rounded-t-xl border-b-2 text-sm transition-all ${
                      isSelected
                        ? 'border-navy bg-white text-navy font-bold shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
                        : 'border-transparent text-muted hover:text-ink hover:bg-paper/50 font-medium'
                    }`}>
                    <div
                      className={`relative flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${
                        isSelected ? 'bg-navy text-white' : 'bg-paper-deep text-muted'
                      }`}>
                      {student.name.charAt(0)}
                    </div>
                    <span>{student.name}</span>

                    {hasUnread && (
                      <span className="size-2 rounded-full bg-amber-400 ring-2 ring-amber-100 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4 gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {activeStudent ? activeStudent.name : 'აირჩიეთ მოსწავლე ზედა ტაბიდან'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {activeStudent ? 'გაგზავნილი ინდივიდუალური ბარათები და დავალებები' : 'დააწკაპუნეთ მოსწავლის სახელზე მისი სამუშაოს სანახავად'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartClassCall}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95">
                  <Video className="size-4" />
                  <span>ვიდეო გაკვეთილი {selectedCourseObj ? `(${selectedCourseObj.title})` : ''}</span>
                </button>

                {activeStudent && (
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy-strong transition-all shadow-sm active:scale-95">
                    <Plus className="size-4" />
                    <span>ბარათის მიმაგრება</span>
                  </button>
                )}
              </div>
            </div>

            {/* თარიღის ნავიგაციის ჰედერი */}
            {activeStudent && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-hairline bg-paper/50 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="size-4 text-navy" />
                  <h4 className="text-sm font-bold text-ink">{formattedSelectedDate}</h4>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-hairline shadow-2xs">
                    {assignmentsForSelectedDate.length} დავალება
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto bg-white p-1 rounded-xl border border-hairline shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleShiftDate(-1)}
                    title="წინა დღე"
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors">
                    <ChevronLeft className="size-4" />
                  </button>

                  <input
                    type="date"
                    value={selectedDateKey}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDateKey(e.target.value);
                    }}
                    className="text-xs font-semibold text-slate-700 bg-transparent px-2 py-1 outline-none cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => handleShiftDate(1)}
                    title="შემდეგი დღე"
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* დავალებების სია */}
            <div className="flex-1 overflow-y-auto pt-4 pe-1 custom-scrollbar">
              {!activeStudent ? (
                <div className="py-24 flex flex-col items-center justify-center text-center text-muted">
                  <Users className="size-12 opacity-30 mb-3 text-navy" />
                  <p className="text-base font-bold text-ink">მოსწავლე არ არის არჩეული</p>
                  <p className="text-xs max-w-xs mt-1 text-muted">
                    აირჩიეთ მოსწავლე ზედა ტაბებიდან, რათა შეამოწმოთ მისი პასუხები.
                  </p>
                </div>
              ) : assignmentsForSelectedDate.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
                  <BookOpen className="size-9 opacity-30 mb-2" />
                  <p className="text-sm font-bold text-ink">ამ თარიღისთვის ბარათები არ არის</p>
                  <p className="text-xs max-w-xs mt-1">
                    {formattedSelectedDate}-ს ამ მოსწავლისთვის დავალებები არ მოიძებნა.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {assignmentsForSelectedDate.map((assignment) => {
                    const isGraded = assignment.status === 'GRADED' || assignment.status === 'RETURNED';
                    const isSubmitted =
                      assignment.status === 'SUBMITTED' || Boolean(assignment.studentAttachmentUrl);

                    return (
                      <div
                        key={assignment.id}
                        onClick={() => {
                          setActiveAssignmentModal({
                            assignment,
                            studentName: activeStudent.name,
                          });
                        }}
                        className={`flex flex-col justify-between gap-3.5 rounded-2xl border p-4 transition-all cursor-pointer group min-h-[280px] ${
                          isGraded
                            ? 'border-emerald-200 bg-emerald-50/20 shadow-xs'
                            : 'border-hairline bg-white hover:border-navy/40 hover:shadow-md'
                        }`}>
                        <div className="flex flex-1 flex-col gap-2.5 min-w-0">
                          {/* ზედა ბეიჯები */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-lg bg-navy-tint px-2.5 py-0.5 text-[10px] font-bold text-navy border border-navy/10">
                              {assignment.type}
                            </span>
                            {isGraded && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="size-3" /> ჩაბარებულია
                              </span>
                            )}
                            {isSubmitted && !isGraded && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200">
                                <UploadCloud className="size-3" /> მოსწავლის პასუხი მიღებულია
                              </span>
                            )}
                            {assignment.commentCount > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                <MessageSquare className="size-3" />
                                {assignment.commentCount}
                              </span>
                            )}
                          </div>

                          {/* სათაური */}
                          <h4 className="text-sm font-bold text-ink group-hover:text-navy transition-colors line-clamp-1 leading-snug">
                            {assignment.title}
                          </h4>

                          {/* 1. მასწავლებლის მიმაგრებული სურათი ან ამოცანის პირობა */}
                          {assignment.problemImageUrl ? (
                            <div className="flex-1 min-h-[140px] rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 flex flex-col items-center justify-center overflow-hidden">
                              <span className="text-[10px] font-bold text-slate-500 self-start mb-1.5 flex items-center gap-1">
                                <ImageIcon className="size-3 text-navy" /> დაფა / ამოცანის სურათი
                              </span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={assignment.problemImageUrl}
                                alt="ამოცანის სურათი"
                                className="flex-1 w-full max-h-56 rounded-lg object-contain bg-white border border-slate-200"
                              />
                            </div>
                          ) : assignment.promptTex ? (
                            <div className="flex-1 min-h-[140px] rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 flex flex-col justify-center overflow-x-auto custom-scrollbar">
                              <KatexPreview
                                tex={assignment.promptTex}
                                className="text-sm text-ink/90 leading-relaxed pointer-events-none"
                              />
                            </div>
                          ) : null}

                          {/* 2. მასწავლებლის შენიშვნა */}
                          {assignment.instructions &&
                            assignment.instructions.trim() !== '' &&
                            assignment.instructions.trim() !== 'გთხოვთ ამოხსნათ მოცემული ამოცანა.' && (
                              <div className="rounded-lg bg-amber-50/50 p-2.5 border border-amber-100/50">
                                <p className="text-xs text-amber-900/70 line-clamp-2">
                                  <span className="font-bold text-amber-800/80 mr-1">შენიშვნა:</span>
                                  {assignment.instructions}
                                </p>
                              </div>
                            )}

                          {/* 3. მოსწავლის მიერ გამოგზავნილი პასუხის მინიატურა */}
                          {assignment.studentAttachmentUrl && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                                <UploadCloud className="size-3.5 text-blue-600" />
                                მოსწავლის პასუხი მიმაგრებულია
                              </span>
                              <span className="text-[10px] font-semibold text-blue-600 underline">
                                ნახვა მოდალში
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ქვედა ღილაკები */}
                        <div className="flex items-center justify-between pt-3 border-t border-hairline-soft">
                          <span className="text-xs font-bold text-navy group-hover:underline flex items-center gap-1">
                            სრულად ნახვა <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                          </span>

                          <button
                            type="button"
                            title="დავალების წაშლა"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingAssignmentId(assignment.id);
                            }}
                            className="flex size-8 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-xs">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 1. ვიდეო გაკვეთილის მოდალი */}
      {activeVideoCallCourse && (
        <ClassroomRoomModal
          courseId={activeVideoCallCourse.id}
          courseTitle={activeVideoCallCourse.title}
          onClose={() => setActiveVideoCallCourse(null)}
          isTeacher={true}
        />
      )}

      {/* 2. ბარათის დამატების მოდალი */}
      {isAssignModalOpen && activeStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !assigning && setIsAssignModalOpen(false)}>
          <div
            className="flex h-[85vh] max-h-[720px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-hairline bg-gradient-to-b from-paper/60 to-white px-6 py-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-navy/10 bg-navy-tint text-navy">
                  <BookOpen className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-ink leading-tight">ბარათის გაგზავნა</h3>
                  <p className="text-sm text-muted mt-0.5 truncate">
                    მიმღები: <span className="font-bold text-ink">{activeStudent.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white text-muted shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
              {/* მარცხენა მხარე */}
              <div className="flex min-h-0 shrink-0 flex-col border-b border-hairline bg-paper/40 lg:w-[300px] lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between border-b border-hairline/70 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-navy" />
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">აირჩიეთ ბარათი</label>
                  </div>
                  <span className="rounded-full bg-white border border-hairline px-2 py-0.5 text-[10px] font-bold text-muted">
                    {availableSetProblems.length}
                  </span>
                </div>

                <div className="px-3 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
                    <input
                      type="text"
                      value={problemSearchQuery}
                      onChange={(e) => setProblemSearchQuery(e.target.value)}
                      placeholder="მოძებნეთ ბარათი..."
                      className="w-full rounded-xl border border-hairline bg-white py-2 pl-9 pr-3 text-xs font-medium text-ink outline-none transition-colors focus:border-navy"
                    />
                  </div>
                </div>

                <div className="max-h-[220px] flex-1 space-y-1.5 overflow-y-auto p-3 custom-scrollbar lg:max-h-none">
                  <button
                    type="button"
                    onClick={() => setSelectedProblemId('custom')}
                    className={`group/item flex w-full items-center gap-3 rounded-xl border-l-[3px] py-2.5 pl-3 pr-2.5 text-left transition-all ${
                      selectedProblemId === 'custom'
                        ? 'border-l-navy bg-white shadow-sm ring-1 ring-navy/15'
                        : 'border-l-transparent bg-white/60 hover:border-l-navy/30 hover:bg-white'
                    }`}>
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${selectedProblemId === 'custom' ? 'bg-navy text-white' : 'bg-navy-tint text-navy'}`}>
                      <ImageIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-bold ${selectedProblemId === 'custom' ? 'text-navy' : 'text-ink'}`}>
                        თავისუფალი დავალება
                      </p>
                      <p className="text-[10px] text-muted">სურათის ან ტექსტის გაგზავნა</p>
                    </div>
                    {selectedProblemId === 'custom' && <Check className="size-4 text-navy shrink-0" strokeWidth={3} />}
                  </button>

                  {availableSetProblems.length > 0 && (
                    <div className="my-2 border-t border-hairline/60"></div>
                  )}

                  {filteredSetProblems.length === 0 && availableSetProblems.length > 0 ? (
                    <p className="py-6 text-center text-xs text-muted">ბარათი არ მოიძებნა</p>
                  ) : (
                    filteredSetProblems.map((prob) => {
                      const isSelected = selectedProblemId === prob.id;
                      return (
                        <button
                          key={prob.id}
                          type="button"
                          onClick={() => setSelectedProblemId(prob.id)}
                          className={`group/item flex w-full items-start gap-2.5 rounded-xl border-l-[3px] py-2.5 pl-3 pr-2.5 text-left transition-all ${
                            isSelected
                              ? 'border-l-navy bg-white shadow-sm ring-1 ring-navy/15'
                              : 'border-l-transparent bg-white/60 hover:border-l-navy/30 hover:bg-white'
                          }`}>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                isSelected ? 'bg-navy text-white border-navy' : 'bg-paper text-navy border-hairline'
                              }`}>
                              {prob.setTitle}
                            </span>
                            <p
                              className={`mt-1.5 truncate text-sm font-bold ${
                                isSelected ? 'text-navy' : 'text-ink'
                              }`}>
                              {prob.title}
                            </p>
                          </div>
                          <div
                            className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? 'border-navy bg-navy'
                                : 'border-hairline bg-white opacity-0 group-hover/item:opacity-100'
                            }`}>
                            {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* მარჯვენა მხარე */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                {selectedProblemId === 'custom' ? (
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">დავალების სათაური</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="მაგ: განტოლებები (გვერდი 45) / თავისუფალი ამოცანა"
                      className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-bold text-ink outline-none transition-shadow focus:border-navy focus:ring-4 focus:ring-navy/5"
                    />
                    <p className="text-xs text-muted">
                      შეგიძლიათ ატვირთოთ სურათი ქვემოთ ან დაწეროთ ინსტრუქცია. სეტის არჩევა სავალდებულო არ არის.
                    </p>
                  </div>
                ) : selectedProblem ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-navy text-white text-[10px] font-bold uppercase px-2.5 py-1 border border-navy">
                        {selectedProblem.setTitle}
                      </span>
                      <h4 className="text-base font-bold text-ink">{selectedProblem.title}</h4>
                    </div>
                    {loadingProblemDetails ? (
                      <div className="rounded-2xl border border-hairline-soft bg-slate-50/60 p-8 flex items-center justify-center">
                        <Loader2 className="size-5 animate-spin text-muted" />
                      </div>
                    ) : selectedProblemDetails ? (
                      <div className="rounded-2xl border border-hairline-soft bg-slate-50/60 p-5 overflow-x-auto">
                        <KatexPreview tex={selectedProblemDetails.promptTex} className="text-ink text-base leading-relaxed" />
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-hairline-soft bg-slate-50/60 p-5 text-xs text-muted">
                        ბარათის პირობის ჩატვირთვა ვერ მოხერხდა
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="rounded-2xl bg-amber-50/40 p-5 border border-amber-200/60 shadow-inner space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                    <MessageSquare className="size-4" />
                    მასწავლებლის შენიშვნა / ტექსტური ინსტრუქცია
                  </label>
                  <textarea
                    value={assignComment}
                    onChange={(e) => setAssignComment(e.target.value)}
                    placeholder={selectedProblemId === 'custom' ? "დაწერეთ ამოცანის პირობა ან მითითება აქ..." : "ჩაწერეთ დამატებითი მითითებები ამ ამოცანისთვის..."}
                    className="w-full resize-none rounded-xl border border-amber-200 bg-white p-4 text-sm text-ink outline-none transition-shadow placeholder:text-amber-900/30 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10"
                    rows={3}
                  />
                </div>

                <div className="rounded-2xl bg-paper p-5 border border-hairline space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                    <UploadCloud className="size-4 text-navy" />
                    სურათის მიმაგრება ბარათზე
                  </label>

                  <input
                    ref={assignFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const base64 = await fileToBase64(file);
                        setAssignImage(base64);
                        setAssignImageName(file.name);
                      }
                    }}
                  />

                  {assignImage ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assignImage} alt="Attachment" className="size-12 rounded-lg object-cover border" />
                      <span className="text-xs font-bold text-ink truncate flex-1">{assignImageName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignImage(null);
                          setAssignImageName(null);
                        }}
                        className="text-rose-600 hover:text-rose-700 p-1">
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => assignFileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-hairline bg-white py-4 text-xs font-bold text-navy hover:bg-navy-tint/30 transition-colors">
                      <UploadCloud className="size-4" />
                      <span>აირჩიეთ ფოტო კომპიუტერიდან</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-hairline bg-white px-6 py-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
              <button
                type="button"
                disabled={assigning}
                onClick={() => setIsAssignModalOpen(false)}
                className="w-full sm:w-auto rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink border border-hairline hover:bg-paper transition-colors disabled:opacity-50">
                გაუქმება
              </button>
              <button
                type="button"
                disabled={isSendDisabled}
                onClick={handleSendProblemToStudent}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-navy-strong disabled:opacity-50 transition-all shadow-md active:scale-95">
                {assigning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>ბარათის გაგზავნა</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ბარათის დეტალების მოდალი */}
      {activeAssignmentModal && (
        <TeacherViewProblemModal
          assignment={activeAssignmentModal.assignment}
          studentName={activeAssignmentModal.studentName}
          onClose={() => setActiveAssignmentModal(null)}
        />
      )}

      {/* 4. დავალების წაშლის მოდალი */}
      {deletingAssignmentId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !isDeleting && setDeletingAssignmentId(null)}>
          <div
            className="w-full max-w-sm rounded-3xl border border-hairline bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-ink">დავალების წაშლა</h4>
                <p className="text-xs text-muted mt-0.5">ეს ქმედება შეუქცევადია</p>
              </div>
            </div>

            <p className="mt-4 rounded-xl border border-rose-100/80 bg-rose-50/50 p-3 text-sm leading-relaxed text-muted">
              დარწმუნებული ხართ, რომ გსურთ ამ ბარათის წაშლა? წაიშლება მოსწავლის პასუხებიც.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingAssignmentId(null)}
                className="w-full sm:w-auto rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-bold text-ink hover:bg-paper transition-colors disabled:opacity-50">
                გაუქმება
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm active:scale-95">
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იშლება...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>დიახ, წაშლა</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}