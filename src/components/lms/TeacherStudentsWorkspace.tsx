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
  Layers,
  FileText,
  File,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  deleteTargetedAssignmentAction,
  getProblemDetailsAction,
  markAssignmentGradedAction,
} from '@/lib/actions/teacher-students';
import { sendProblemToStudentAction } from '@/lib/actions/students';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
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

type ContentTab = 'tasks' | 'answers' | 'materials';

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

function isImageString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.endsWith('.png') ||
    trimmed.endsWith('.jpg') ||
    trimmed.endsWith('.jpeg') ||
    trimmed.endsWith('.webp')
  );
}

function extractFirstImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0];
      }
    } catch {
      // ignore
    }
  }

  if (isImageString(trimmed)) {
    return trimmed;
  }

  return null;
}

function getAssignmentViewKey(a: StudentAssignment): string {
  return `${a.id}:${a.submissionId || ''}:${a.studentAttachmentUrl || ''}:${a.status}`;
}

// 🌟 უნივერსალური შემოწმება: არის თუ არა მასალა (რეფრეშის მერეც) 🌟
function isMaterialItem(a: StudentAssignment): boolean {
  return (
    a.type === 'MATERIAL' ||
    (typeof a.id === 'string' && a.id.startsWith('mat-')) ||
    (typeof a.instructions === 'string' &&
      (a.instructions.trim().toLowerCase() === 'მასალა' ||
        a.instructions.trim().toLowerCase().startsWith('მასალა:'))) ||
    (typeof a.promptTex === 'string' && a.promptTex.startsWith('ფაილი:')) ||
    (typeof a.problemImageUrl === 'string' &&
      (a.problemImageUrl.endsWith('.pdf') ||
        a.problemImageUrl.endsWith('.doc') ||
        a.problemImageUrl.endsWith('.docx') ||
        a.problemImageUrl.endsWith('.txt')))
  );
}

const STORAGE_KEY = 'mathlab_teacher_viewed_assignments_v2';

export function TeacherStudentsWorkspace({
  initialStudents = [],
  courses = [],
  availableSetProblems = [],
}: TeacherStudentsWorkspaceProps) {
  const [students, setStudents] = useState<StudentItem[]>(initialStudents);
  const [activeCourseId, setActiveCourseId] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<ContentTab>('tasks');

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState('');

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateToKey(new Date()));

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

  useEffect(() => {
    if (!isReady) return;
    let changed = false;
    const next = new Set(viewedKeys);

    for (const student of students) {
      for (const a of student.assignments) {
        const isSubmitted =
          (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) &&
          a.status !== 'GRADED';

        if (!isSubmitted) {
          for (const key of Array.from(next)) {
            if (key.startsWith(`${a.id}:`) || key === a.id) {
              next.delete(key);
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      setViewedKeys(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}
    }
  }, [students, isReady, viewedKeys]);

  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeAssignmentModal, setActiveAssignmentModal] = useState<{
    assignment: StudentAssignment;
    studentName: string;
    mode: 'task' | 'answer';
  } | null>(null);

  // მასალის ნახვის მოდალი
  const [previewMaterialModal, setPreviewMaterialModal] = useState<{
    url: string;
    title: string;
    instructions?: string | null;
  } | null>(null);

  // 1. დავალების დამატების მოდალი
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

  // 2. მასალების ატვირთვის მოდალი
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialNote, setMaterialNote] = useState('');
  const [materialFileBase64, setMaterialFileBase64] = useState<string | null>(null);
  const [materialFileName, setMaterialFileName] = useState<string | null>(null);
  const [materialFileType, setMaterialFileType] = useState<string | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  const [activeVideoCallCourse, setActiveVideoCallCourse] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const isAnyModalOpen = Boolean(
    deletingAssignmentId ||
      activeAssignmentModal ||
      previewMaterialModal ||
      isAssignModalOpen ||
      isMaterialModalOpen ||
      activeVideoCallCourse,
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
    () => students.filter((s) => (activeCourseId === 'all' ? true : s.courses.some((c) => c.id === activeCourseId))),
    [students, activeCourseId],
  );

  const activeStudent = students.find((s) => s.id === selectedStudentId);
  const selectedCourseObj = courses.find((c) => c.id === activeCourseId);

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

  const unreadStudentIds = useMemo(() => {
    if (!isReady) return new Set<string>();
    const ids = new Set<string>();
    for (const student of students) {
      const hasUnread = student.assignments.some((a) => {
        const isSubmitted =
          (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) &&
          a.status !== 'GRADED';
        const key = getAssignmentViewKey(a);
        return isSubmitted && !viewedKeys.has(key);
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

  // 🌟 ტაბების მიხედვით გაფილტრული სია (მკაცრი ფილტრაციით) 🌟
  const filteredTabAssignments = useMemo(() => {
    if (activeTab === 'answers') {
      return assignmentsForSelectedDate.filter(
        (a) => !isMaterialItem(a) && (Boolean(a.studentAttachmentUrl) || a.status === 'SUBMITTED' || a.status === 'GRADED'),
      );
    }
    if (activeTab === 'materials') {
      return assignmentsForSelectedDate.filter((a) => isMaterialItem(a));
    }
    // tasks tab -> მკაცრად მხოლოდ დავალებები (მასალების გარეშე)
    return assignmentsForSelectedDate.filter((a) => !isMaterialItem(a));
  }, [assignmentsForSelectedDate, activeTab]);

  const answersCountForDate = useMemo(() => {
    return assignmentsForSelectedDate.filter(
      (a) => !isMaterialItem(a) && (Boolean(a.studentAttachmentUrl) || a.status === 'SUBMITTED' || a.status === 'GRADED'),
    ).length;
  }, [assignmentsForSelectedDate]);

  const materialsCountForDate = useMemo(() => {
    return assignmentsForSelectedDate.filter((a) => isMaterialItem(a)).length;
  }, [assignmentsForSelectedDate]);

  const tasksCountForDate = useMemo(() => {
    return assignmentsForSelectedDate.filter((a) => !isMaterialItem(a)).length;
  }, [assignmentsForSelectedDate]);

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

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);

    const student = students.find((s) => s.id === studentId);
    if (student) {
      const newUnreadKeys = student.assignments
        .filter((a) => {
          const isSub =
            (a.status === 'SUBMITTED' || a.status === 'RETURNED' || Boolean(a.studentAttachmentUrl)) &&
            a.status !== 'GRADED';
          const key = getAssignmentViewKey(a);
          return isSub && !viewedKeys.has(key);
        })
        .map((a) => getAssignmentViewKey(a));

      if (newUnreadKeys.length > 0) {
        setViewedKeys((prev) => {
          const next = new Set(prev);
          newUnreadKeys.forEach((key) => next.add(key));
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
      let resolvedImage: string | null = null;
      if (assignImage) {
        const uploaded = await uploadImageToStorageAction({
          dataUrl: assignImage,
          fileName: assignImageName || undefined,
        });
        if (!uploaded.success || !uploaded.url) {
          alert('სურათის ატვირთვა ვერ მოხერხდა');
          return;
        }
        resolvedImage = uploaded.url;
      }

      const res = await sendProblemToStudentAction({
        studentId: activeStudent.id,
        instructions: safeComment || undefined,
        attachmentUrl: resolvedImage,
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
          problemImageUrl: resolvedImage,
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

  // 🌟 სასწავლო მასალის ატვირთვა (მკაფიო მარკირებით)
  async function handleUploadMaterial() {
    if (!activeStudent || !materialFileBase64) return;

    const safeTitle = (materialTitle ?? '').trim() || materialFileName || 'სასწავლო მასალა';
    const safeNote = (materialNote ?? '').trim() ? `მასალა: ${materialNote.trim()}` : 'მასალა';

    setUploadingMaterial(true);

    try {
      const uploaded = await uploadImageToStorageAction({
        dataUrl: materialFileBase64,
        fileName: materialFileName || undefined,
      });

      if (!uploaded.success || !uploaded.url) {
        alert('მასალის ატვირთვა ვერ მოხერხდა');
        return;
      }

      const res = await sendProblemToStudentAction({
        studentId: activeStudent.id,
        instructions: safeNote,
        attachmentUrl: uploaded.url,
        problem: {
          id: 'mat-' + Date.now(),
          topic: safeTitle,
          difficulty: 'easy',
          promptTex: materialFileName ? `ფაილი: ${materialFileName}` : '',
          solutionTex: '',
        },
      });

      if (res.success) {
        const newMaterial: StudentAssignment = {
          id: res.assignmentId || 'mat-' + Date.now(),
          title: safeTitle,
          type: 'MATERIAL',
          instructions: safeNote,
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
          promptTex: materialFileName ? `ფაილი: ${materialFileName}` : '',
          problemImageUrl: uploaded.url,
          studentAttachmentUrl: null,
          commentCount: 0,
        };

        setStudents((prev) =>
          prev.map((s) => (s.id === activeStudent.id ? { ...s, assignments: [newMaterial, ...s.assignments] } : s)),
        );
        setSelectedDateKey(formatDateToKey(new Date()));
        setIsMaterialModalOpen(false);
        setMaterialTitle('');
        setMaterialNote('');
        setMaterialFileBase64(null);
        setMaterialFileName(null);
        setMaterialFileType(null);
        setActiveTab('materials');
      } else {
        alert('გაგზავნა ვერ მოხერხდა: ' + (res.error || 'უცნობი შეცდომა'));
      }
    } catch (error) {
      console.error(error);
      alert('დაფიქსირდა შეცდომა მასალის გაგზავნისას.');
    } finally {
      setUploadingMaterial(false);
    }
  }

  const isSendDisabled =
    assigning ||
    (selectedProblemId === 'custom' && !assignImage && !(assignComment ?? '').trim()) ||
    (selectedProblemId !== 'custom' && (!selectedProblem || loadingProblemDetails || !selectedProblemDetails));

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
        {/* მარცხენა სვეტი: კლასები + მართვის ღილაკები */}
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

          {/* მარცხენა სვეტის ქვედა ღილაკები */}
          <div className="border-t border-hairline pt-3 mt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleStartClassCall}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95">
              <Video className="size-4 shrink-0" />
              <span className="truncate">
                ვიდეო გაკვეთილი {selectedCourseObj ? `(${selectedCourseObj.title})` : ''}
              </span>
            </button>

            {activeStudent && (
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-3 py-2.5 text-xs font-bold text-white hover:bg-navy-strong transition-all shadow-sm active:scale-95">
                <Plus className="size-4 shrink-0" />
                <span className="truncate">ბარათის მიმაგრება</span>
              </button>
            )}
          </div>
        </aside>

        {/* მარჯვენა სვეტი: მოსწავლეების ტაბები + ზედა კალენდარი + სამუშაო დაფა */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white shadow-sm overflow-hidden">
          {/* ზედა ზოლი 1: მოსწავლეების ტაბები + კალენდარი */}
          <div className="bg-paper/30 border-b border-hairline px-3 py-1.5 flex items-center justify-between gap-3">
            <div className="flex-1 overflow-x-auto flex items-center gap-1.5 custom-scrollbar">
              {studentsInActiveCourse.length === 0 ? (
                <p className="py-2 px-2 text-xs font-bold text-muted">ამ კლასში მოსწავლეები არ არიან</p>
              ) : (
                studentsInActiveCourse.map((student) => {
                  const isSelected = selectedStudentId === student.id;
                  const hasUnread = unreadStudentIds.has(student.id);

                  // რიცხვი აჩვენებს მხოლოდ რეალურ დავალებებს
                  const dateAssignmentsCount = student.assignments.filter((a) => {
                    return formatDateToKey(new Date(a.createdAt)) === selectedDateKey && !isMaterialItem(a);
                  }).length;

                  return (
                    <button
                      key={student.id}
                      onClick={() => handleStudentSelect(student.id)}
                      className={`relative flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-navy text-white shadow-sm'
                          : 'bg-white/80 text-muted hover:text-ink hover:bg-white border border-hairline'
                      }`}>
                      <div
                        className={`relative flex size-5 items-center justify-center rounded-full text-[9px] font-bold ${
                          isSelected ? 'bg-white text-navy' : 'bg-paper-deep text-muted'
                        }`}>
                        {student.name.charAt(0)}
                      </div>
                      <span>{student.name}</span>

                      <span
                        className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                        }`}>
                        {dateAssignmentsCount}
                      </span>

                      {hasUnread && <span className="size-2 rounded-full bg-amber-400 ring-2 ring-white shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* ზედა მარჯვენა კალენდარი */}
            {activeStudent && (
              <div className="flex items-center gap-1 shrink-0 bg-white px-2 py-1 rounded-xl border border-hairline shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleShiftDate(-1)}
                  title="წინა დღე"
                  className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors">
                  <ChevronLeft className="size-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  <CalendarIcon className="size-3.5 text-navy shrink-0" />
                  <input
                    type="date"
                    value={selectedDateKey}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDateKey(e.target.value);
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleShiftDate(1)}
                  title="შემდეგი დღე"
                  className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* ზედა ზოლი 2: სამი საკონტროლო ტაბი (დავალებები, პასუხები, მასალები) */}
          <div className="bg-paper/40 border-b border-hairline px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 p-1 bg-paper-deep rounded-2xl border border-hairline/80">
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-white text-navy shadow-xs ring-1 ring-black/5'
                    : 'text-muted hover:text-ink'
                }`}>
                <BookOpen className="size-3.5" />
                <span>დავალებები</span>
                <span className="text-[10px] opacity-70">({tasksCountForDate})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('answers')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'answers'
                    ? 'bg-white text-navy shadow-xs ring-1 ring-black/5'
                    : 'text-muted hover:text-ink'
                }`}>
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>პასუხები</span>
                {answersCountForDate > 0 && (
                  <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.2 text-[9px] font-bold">
                    {answersCountForDate}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'materials'
                    ? 'bg-white text-navy shadow-xs ring-1 ring-black/5'
                    : 'text-muted hover:text-ink'
                }`}>
                <Layers className="size-3.5 text-indigo-500" />
                <span>მასალები</span>
                {materialsCountForDate > 0 && (
                  <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-[9px] font-bold">
                    {materialsCountForDate}
                  </span>
                )}
              </button>
            </div>

            {/* მასალების ტაბზე გამოჩნდება ატვირთვის ღილაკი */}
            {activeTab === 'materials' && activeStudent && (
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-xs active:scale-95">
                <UploadCloud className="size-3.5" />
                <span>მასალის ატვირთვა</span>
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-5">
            {/* ბარათების Grid სექცია */}
            <div className="flex-1 overflow-y-auto pt-2 pe-1 custom-scrollbar">
              {!activeStudent ? (
                <div className="py-24 flex flex-col items-center justify-center text-center text-muted">
                  <Users className="size-12 opacity-30 mb-3 text-navy" />
                  <p className="text-base font-bold text-ink">მოსწავლე არ არის არჩეული</p>
                  <p className="text-xs max-w-xs mt-1 text-muted">
                    აირჩიეთ მოსწავლე ზედა ტაბებიდან, რათა შეამოწმოთ მისი პასუხები.
                  </p>
                </div>
              ) : filteredTabAssignments.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
                  {activeTab === 'tasks' ? (
                    <>
                      <BookOpen className="size-9 opacity-30 mb-2" />
                      <p className="text-sm font-bold text-ink">ამ თარიღისთვის დავალებები არ არის</p>
                    </>
                  ) : activeTab === 'answers' ? (
                    <>
                      <CheckCircle2 className="size-9 opacity-30 mb-2 text-emerald-600" />
                      <p className="text-sm font-bold text-ink">მოსწავლის პასუხები ჯერ არ არის მიღებული</p>
                    </>
                  ) : (
                    <>
                      <Layers className="size-9 opacity-30 mb-2 text-indigo-500" />
                      <p className="text-sm font-bold text-ink">სასწავლო მასალები არ არის ატვირთული</p>
                      <button
                        type="button"
                        onClick={() => setIsMaterialModalOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all">
                        <UploadCloud className="size-3.5" />
                        <span>ატვირთეთ პირველი მასალა</span>
                      </button>
                    </>
                  )}
                  <p className="text-xs max-w-xs mt-1">
                    {formattedSelectedDate}-ს ამ სექციაში მონაცემები არ მოიძებნა.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {filteredTabAssignments.map((assignment) => {
                    const isGraded = assignment.status === 'GRADED' || assignment.status === 'RETURNED';
                    const isSubmitted = assignment.status === 'SUBMITTED' || Boolean(assignment.studentAttachmentUrl);
                    const isMaterial = isMaterialItem(assignment);

                    // პასუხების ტაბზე ვაჩვენებთ მოსწავლის პასუხის სურათს
                    const displayImageUrl =
                      activeTab === 'answers' && assignment.studentAttachmentUrl
                        ? extractFirstImageUrl(assignment.studentAttachmentUrl)
                        : extractFirstImageUrl(assignment.problemImageUrl) || extractFirstImageUrl(assignment.promptTex);

                    const isPdfOrDoc =
                      assignment.problemImageUrl &&
                      !isImageString(assignment.problemImageUrl) &&
                      (assignment.problemImageUrl.endsWith('.pdf') ||
                        assignment.problemImageUrl.endsWith('.doc') ||
                        assignment.problemImageUrl.endsWith('.docx') ||
                        assignment.problemImageUrl.endsWith('.txt'));

                    return (
                      <div
                        key={assignment.id}
                        onClick={() => {
                          // მასალაზე დაჭერისას იხსნება მოდალი
                          if (isMaterial && assignment.problemImageUrl) {
                            setPreviewMaterialModal({
                              url: assignment.problemImageUrl,
                              title: assignment.title,
                              instructions: assignment.instructions,
                            });
                            return;
                          }
                          setActiveAssignmentModal({
                            assignment,
                            studentName: activeStudent.name,
                            mode: activeTab === 'answers' ? 'answer' : 'task',
                          });
                        }}
                        className={`flex flex-col justify-between rounded-2xl border p-3 transition-all cursor-pointer group min-h-[210px] ${
                          isMaterial
                            ? 'border-indigo-200 bg-indigo-50/20 hover:border-indigo-400 hover:shadow-md'
                            : isGraded
                              ? 'border-emerald-200 bg-emerald-50/20 shadow-xs'
                              : 'border-hairline bg-white hover:border-navy/40 hover:shadow-md'
                        }`}>
                        <div className="flex flex-col gap-2 min-w-0">
                          {/* ზედა ბეიჯები */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border truncate ${
                                isMaterial
                                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                  : 'bg-navy-tint text-navy border-navy/10'
                              }`}>
                              {isMaterial ? 'მასალა' : assignment.type}
                            </span>
                            {isGraded ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="size-3" /> ჩაბარებულია
                              </span>
                            ) : isSubmitted ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 truncate">
                                <UploadCloud className="size-3" /> პასუხი მიღებულია
                              </span>
                            ) : null}
                          </div>

                          {/* ფაილის / სურათის პრევიუ */}
                          {displayImageUrl ? (
                            <div className="w-full h-32 rounded-xl border border-slate-800 bg-slate-950 p-1.5 flex items-center justify-center overflow-hidden shadow-inner">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={displayImageUrl}
                                alt="დავალების სურათი"
                                className="w-full h-full object-contain rounded bg-slate-900/60"
                              />
                            </div>
                          ) : isPdfOrDoc || isMaterial ? (
                            <div className="w-full h-32 rounded-xl bg-indigo-50/70 border border-indigo-100 p-3 flex flex-col items-center justify-center text-center">
                              <FileText className="size-9 text-indigo-600 mb-1.5" />
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">{assignment.title}</p>
                              <span className="text-[10px] font-semibold text-indigo-600 mt-1">ფაილის გახსნა ↗</span>
                            </div>
                          ) : assignment.promptTex ? (
                            <div className="w-full h-32 rounded-xl bg-paper-deep p-3 flex items-center justify-center overflow-hidden">
                              <KatexPreview
                                tex={assignment.promptTex}
                                className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
                              />
                            </div>
                          ) : null}

                          {isMaterial && (
                            <p className="text-xs font-bold text-slate-800 truncate px-1">{assignment.title}</p>
                          )}
                        </div>

                        {/* ქვედა ზოლი: სრულად ნახვა და წაშლა */}
                        <div className="flex items-center justify-between pt-2 border-t border-hairline-soft">
                          <span className="text-xs font-bold text-navy group-hover:underline flex items-center gap-1">
                            {isMaterial ? 'მასალის გახსნა' : 'ნახვა'}{' '}
                            <span className="transition-transform group-hover:translate-x-0.5">→</span>
                          </span>

                          <button
                            type="button"
                            title="წაშლა"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingAssignmentId(assignment.id);
                            }}
                            className="flex size-7 items-center justify-center rounded-lg border border-hairline bg-white text-muted hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-2xs">
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
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Send className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">დავალების გაგზავნა</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    მოსწავლე: <span className="font-bold text-slate-800">{activeStudent.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-white">
              <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedProblemId('custom')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    selectedProblemId === 'custom'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}>
                  <ImageIcon className="size-3.5" />
                  <span>თავისუფალი (სურათი / ტექსტი)</span>
                </button>
                {availableSetProblems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProblemId === 'custom' && availableSetProblems[0]) {
                        setSelectedProblemId(availableSetProblems[0].id);
                      }
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      selectedProblemId !== 'custom'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}>
                    <BookOpen className="size-3.5" />
                    <span>ბანკიდან არჩევა ({availableSetProblems.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {selectedProblemId === 'custom' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">სურათის მიმაგრება</label>
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
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assignImage}
                          alt="Attachment"
                          className="size-14 rounded-lg object-cover border bg-white"
                        />
                        <span className="text-xs font-bold text-slate-800 truncate flex-1">{assignImageName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignImage(null);
                            setAssignImageName(null);
                          }}
                          className="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => assignFileRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-5 text-xs font-bold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/30 hover:text-indigo-600 transition-all">
                        <UploadCloud className="size-5 text-slate-400" />
                        <span>დააწკაპუნეთ სურათის ასარჩევად</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      შენიშვნა / ინსტრუქცია (არასავალდებულო)
                    </label>
                    <textarea
                      value={assignComment}
                      onChange={(e) => setAssignComment(e.target.value)}
                      placeholder="ჩაწერეთ მითითებები მოსწავლისთვის..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={problemSearchQuery}
                      onChange={(e) => setProblemSearchQuery(e.target.value)}
                      placeholder="მოძებნეთ ბარათი..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/40">
                    {filteredSetProblems.map((prob) => {
                      const isSelected = selectedProblemId === prob.id;
                      return (
                        <button
                          key={prob.id}
                          type="button"
                          onClick={() => setSelectedProblemId(prob.id)}
                          className={`flex w-full items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/60'
                          }`}>
                          <div className="min-w-0 flex-1 pr-2">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider block ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {prob.setTitle}
                            </span>
                            <p className="text-xs font-bold truncate mt-0.5">{prob.title}</p>
                          </div>
                          {isSelected && <Check className="size-4 shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>

                  {selectedProblem && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        ამოცანის პირობა:
                      </span>
                      {loadingProblemDetails ? (
                        <div className="py-4 flex justify-center">
                          <Loader2 className="size-4 animate-spin text-slate-400" />
                        </div>
                      ) : selectedProblemDetails ? (
                        <KatexPreview tex={selectedProblemDetails.promptTex} className="text-xs text-slate-900" />
                      ) : null}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">დამატებითი მითითება</label>
                    <textarea
                      value={assignComment}
                      onChange={(e) => setAssignComment(e.target.value)}
                      placeholder="ჩაწერეთ მითითება ამ ამოცანისთვის..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={assigning}
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
                გაუქმება
              </button>
              <button
                type="button"
                disabled={isSendDisabled}
                onClick={handleSendProblemToStudent}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs active:scale-95">
                {assigning ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>გაგზავნა</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. სასწავლო მასალის ატვირთვის მოდალი */}
      {isMaterialModalOpen && activeStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !uploadingMaterial && setIsMaterialModalOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">სასწავლო მასალის ატვირთვა</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    მოსწავლე: <span className="font-bold text-slate-800">{activeStudent.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">მასალის სათაური</label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="მაგ: თეორიული მასალა (გეომეტრია)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  ფაილი (სურათი, PDF, Word, TXT)
                </label>
                <input
                  ref={materialFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const base64 = await fileToBase64(file);
                      setMaterialFileBase64(base64);
                      setMaterialFileName(file.name);
                      setMaterialFileType(file.type);
                      if (!materialTitle) setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                />

                {materialFileBase64 ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <FileText className="size-8 text-indigo-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{materialFileName}</p>
                      <span className="text-[10px] text-slate-500">მზადაა ასატვირთად</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMaterialFileBase64(null);
                        setMaterialFileName(null);
                        setMaterialFileType(null);
                      }}
                      className="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => materialFileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 py-6 text-xs font-bold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/30 hover:text-indigo-600 transition-all">
                    <UploadCloud className="size-6 text-slate-400" />
                    <span>დააწკაპუნეთ ფაილის ასარჩევად</span>
                    <span className="text-[10px] text-slate-400 font-normal">PDF, DOCX, TXT, PNG, JPG</span>
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  შენიშვნა / კომენტარი (არასავალდებულო)
                </label>
                <textarea
                  value={materialNote}
                  onChange={(e) => setMaterialNote(e.target.value)}
                  placeholder="ჩაწერეთ მითითება ამ მასალისთვის..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  rows={2}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={uploadingMaterial}
                onClick={() => setIsMaterialModalOpen(false)}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
                გაუქმება
              </button>
              <button
                type="button"
                disabled={uploadingMaterial || !materialFileBase64}
                onClick={handleUploadMaterial}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs active:scale-95">
                {uploadingMaterial ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>იტვირთება...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" />
                    <span>ატვირთვა</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ბარათის დეტალების მოდალი */}
      {activeAssignmentModal && (
        <TeacherViewProblemModal
          assignment={activeAssignmentModal.assignment}
          studentName={activeAssignmentModal.studentName}
          mode={activeAssignmentModal.mode}
          onClose={() => setActiveAssignmentModal(null)}
        />
      )}

      {/* 🌟 5. მასალის ნახვის მოდალი (სურათი ან PDF/დოკუმენტი) 🌟 */}
      {previewMaterialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewMaterialModal(null)}>
          <div
            className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Layers className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                    {previewMaterialModal.title}
                  </h3>
                  {previewMaterialModal.instructions && previewMaterialModal.instructions !== 'მასალა' && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{previewMaterialModal.instructions}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewMaterialModal.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  <Download className="size-3.5" />
                  <span>გადმოწერა</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMaterialModal(null)}
                  className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
              {isImageString(previewMaterialModal.url) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewMaterialModal.url}
                  alt={previewMaterialModal.title}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={previewMaterialModal.url}
                  title={previewMaterialModal.title}
                  className="w-full h-full rounded-lg bg-white border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. დავალების წაშლის მოდალი */}
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
                <h4 className="text-base font-bold text-ink">წაშლა</h4>
                <p className="text-xs text-muted mt-0.5">ეს ქმედება შეუქცევადია</p>
              </div>
            </div>

            <p className="mt-4 rounded-xl border border-rose-100/80 bg-rose-50/50 p-3 text-sm leading-relaxed text-muted">
              დარწმუნებული ხართ, რომ გსურთ ამ ჩანაწერის წაშლა?
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