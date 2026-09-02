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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="size-8 animate-spin text-orange-500" />
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

function isDocumentString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.toLowerCase().trim();
  return (
    trimmed.endsWith('.pdf') ||
    trimmed.endsWith('.txt') ||
    trimmed.endsWith('.doc') ||
    trimmed.endsWith('.docx') ||
    trimmed.endsWith('.rtf') ||
    trimmed.endsWith('.csv') ||
    trimmed.endsWith('.bin') ||
    (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/'))
  );
}

function isImageString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.toLowerCase().trim();

  if (isDocumentString(trimmed)) return false;

  return (
    trimmed.startsWith('data:image/') ||
    trimmed.includes('.png') ||
    trimmed.includes('.jpg') ||
    trimmed.includes('.jpeg') ||
    trimmed.includes('.webp') ||
    trimmed.includes('.gif') ||
    trimmed.includes('.svg')
  );
}

function extractFirstImageUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const firstImage = parsed.find((item): item is string => typeof item === 'string' && isImageString(item));
        if (firstImage) return firstImage;
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

function isMaterialItem(a: StudentAssignment): boolean {
  return (
    a.type === 'MATERIAL' ||
    (typeof a.id === 'string' && a.id.startsWith('mat-')) ||
    (typeof a.instructions === 'string' &&
      (a.instructions.trim().toLowerCase() === 'მასალა' ||
        a.instructions.trim().toLowerCase().startsWith('მასალა:'))) ||
    (typeof a.promptTex === 'string' && a.promptTex.startsWith('ფაილი:')) ||
    (typeof a.problemImageUrl === 'string' && isDocumentString(a.problemImageUrl))
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

  const [previewMaterialModal, setPreviewMaterialModal] = useState<{
    url: string;
    title: string;
    instructions?: string | null;
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

  const filteredTabAssignments = useMemo(() => {
    if (activeTab === 'answers') {
      return assignmentsForSelectedDate.filter(
        (a) =>
          !isMaterialItem(a) && (Boolean(a.studentAttachmentUrl) || a.status === 'SUBMITTED' || a.status === 'GRADED'),
      );
    }
    if (activeTab === 'materials') {
      return assignmentsForSelectedDate.filter((a) => isMaterialItem(a));
    }
    return assignmentsForSelectedDate.filter((a) => !isMaterialItem(a));
  }, [assignmentsForSelectedDate, activeTab]);

  const answersCountForDate = useMemo(() => {
    return assignmentsForSelectedDate.filter(
      (a) =>
        !isMaterialItem(a) && (Boolean(a.studentAttachmentUrl) || a.status === 'SUBMITTED' || a.status === 'GRADED'),
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
        <aside className="flex h-full min-h-0 flex-col rounded-3xl border border-hairline bg-paper shadow-sm overflow-hidden">
          {/* ჰედერი */}
          <div className="w-full flex shrink-0 items-center justify-between border-b border-hairline bg-surface/50 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-brass-strong" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink">კლასები</h3>
            </div>
            <span className="rounded-md bg-paper-deep px-2 py-0.5 text-[10px] font-mono font-bold text-muted border border-hairline/60">
              {courses.length}
            </span>
          </div>

          {/* შუა ნაწილი */}
          <div className="flex flex-1 min-h-0 flex-col p-3 gap-2.5">
            {/* საძიებო ველი */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
              <input
                type="text"
                value={classSearchQuery}
                onChange={(e) => setClassSearchQuery(e.target.value)}
                placeholder="მოძებნეთ კლასი..."
                className="w-full rounded-xl border border-hairline bg-paper-deep/80 py-2 pl-9 pr-3 text-xs font-medium text-ink placeholder:text-muted outline-none focus:border-brass-strong/60 focus:bg-surface transition-all"
              />
            </div>

            {/* ჩაღრმავებული კონტეინერი სიისთვის (მე-5 ვარიანტიდან) */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-hairline/60 bg-paper-deep/30 p-1.5 space-y-1 custom-scrollbar">
              {/* ყველა მოსწავლე */}
              <button
                type="button"
                onClick={() => handleCourseChange('all')}
                className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all border ${
                  activeCourseId === 'all'
                    ? 'bg-surface border-hairline text-ink shadow-2xs font-bold'
                    : 'border-transparent text-body hover:bg-surface/50 hover:text-ink'
                }`}>
                {/* მარცხენა აქცენტის ზოლი (1-ლი ვარიანტიდან) */}
                {activeCourseId === 'all' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brass-strong" />
                )}
                <span className="truncate text-xs">ყველა მოსწავლე</span>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                    activeCourseId === 'all' ? 'bg-paper-deep text-ink' : 'text-muted'
                  }`}>
                  {students.length}
                </span>
              </button>

              {/* კურსების სია */}
              {filteredCourses.map((course) => {
                const active = course.id === activeCourseId;
                const courseStudents = students.filter((s) => s.courses.some((c) => c.id === course.id));

                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleCourseChange(course.id)}
                    className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all border ${
                      active
                        ? 'bg-surface border-hairline text-ink shadow-2xs font-bold'
                        : 'border-transparent text-body hover:bg-surface/50 hover:text-ink'
                    }`}>
                    {/* მარცხენა აქცენტის ზოლი (1-ლი ვარიანტიდან) */}
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brass-strong" />
                    )}
                    <span className="truncate text-xs">{course.title}</span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                        active ? 'bg-paper-deep text-ink' : 'text-muted'
                      }`}>
                      {courseStudents.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* მუდმივად ქვემოთ მიმაგრებული ღილაკები */}
          <div className="mt-auto shrink-0 border-t border-hairline bg-paper-deep/30 p-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartClassCall}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface py-2 px-2 text-xs font-bold text-ink hover:border-navy/60 hover:bg-navy-tint/20 hover:text-navy active:scale-98 transition-all cursor-pointer min-w-0 shadow-2xs">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-navy/15 text-navy">
                <Video className="size-3" />
              </div>
              <span className="truncate">გაკვეთილი</span>
            </button>

            {activeStudent && (
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface py-2 px-2 text-xs font-bold text-ink hover:border-brass/60 hover:bg-brass-tint/30 hover:text-brass-strong active:scale-98 transition-all cursor-pointer min-w-0 shadow-2xs">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-brass-tint text-brass-strong">
                  <Plus className="size-3" />
                </div>
                <span className="truncate">ბარათი</span>
              </button>
            )}
          </div>
        </aside>

        {/* მარჯვენა სვეტი: მოსწავლეების ტაბები + ზედა კალენდარი + სამუშაო დაფა */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-paper shadow-sm overflow-hidden">
          {/* 🌟 1. ზედა ზოლი: მოსწავლეების ტაბები და კალენდარი */}
          <div className="bg-surface border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* მოსწავლეების ტაბები */}
            <div className="flex-1 overflow-x-auto flex items-center gap-1.5 custom-scrollbar min-w-0 pb-0.5 sm:pb-0">
              {studentsInActiveCourse.length === 0 ? (
                <p className="py-1 px-1 text-xs font-bold text-muted">ამ კლასში მოსწავლეები არ არიან</p>
              ) : (
                studentsInActiveCourse.map((student) => {
                  const isSelected = selectedStudentId === student.id;
                  const hasUnread = unreadStudentIds.has(student.id);

                  const dateAssignmentsCount = student.assignments.filter((a) => {
                    return formatDateToKey(new Date(a.createdAt)) === selectedDateKey && !isMaterialItem(a);
                  }).length;

                  return (
                    <button
                      key={student.id}
                      onClick={() => handleStudentSelect(student.id)}
                      className={`group relative flex items-center gap-2 shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                        isSelected
                          ? 'bg-surface border-hairline/90 shadow-inner'
                          : 'bg-transparent border-transparent hover:bg-surface/50 text-body hover:text-ink'
                      }`}>
                      <span
                        className={`truncate max-w-[120px] sm:max-w-none transition-colors ${isSelected ? 'text-ink' : ''}`}>
                        {student.name}
                      </span>

                      {hasUnread && <span className="size-2 rounded-full bg-orange-500 ring-2 ring-surface shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* ზედა კალენდარი */}
            {activeStudent && (
              <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 bg-brass-tint/30 hover:bg-brass-tint/50 px-2.5 py-1.5 rounded-xl border border-brass/25 shadow-inner transition-colors w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleShiftDate(-1)}
                    title="წინა დღე"
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-paper-deep text-muted hover:text-ink transition-colors shrink-0">
                    <ChevronLeft className="size-4" />
                  </button>

                  <div
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      input?.showPicker?.();
                    }}
                    className="group flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl hover:bg-surface transition-colors cursor-pointer flex-1 sm:flex-none">
                    <CalendarIcon className="size-3.5 text-brass-strong group-hover:text-brass shrink-0 transition-colors" />
                    <input
                      type="date"
                      value={selectedDateKey}
                      onChange={(e) => {
                        if (e.target.value) setSelectedDateKey(e.target.value);
                      }}
                      className="text-xs font-bold text-ink bg-transparent outline-none cursor-pointer text-center [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShiftDate(1)}
                    title="შემდეგი დღე"
                    className="flex size-7 items-center justify-center rounded-lg hover:bg-paper-deep text-muted hover:text-ink transition-colors shrink-0">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🌟 2. ტაბების ზოლი: დავალებები / პასუხები / მასალები */}
          <div className="bg-surface/70 border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="w-full sm:w-auto p-1 bg-paper-deep/80 rounded-2xl border border-hairline">
              <div className="grid grid-cols-3 sm:flex items-center gap-1">
                {/* 1. დავალებები */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center ${
                    activeTab === 'tasks'
                      ? 'bg-surface text-ink shadow-inner border-hairline/80'
                      : 'bg-transparent border-transparent text-body hover:text-ink'
                  }`}>
                  <span className="truncate">დავალებები</span>
                  <span className=" text-brass-soft px-1.5 py-0.5 text-[12px] font-bold shrink-0">
                    {tasksCountForDate}
                  </span>
                </button>

                {/* 2. პასუხები */}
                <button
                  type="button"
                  onClick={() => setActiveTab('answers')}
                  className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center ${
                    activeTab === 'answers'
                      ? 'bg-surface text-ink shadow-inner border-hairline/80'
                      : 'bg-transparent border-transparent text-body hover:text-ink'
                  }`}>
                  <span className="truncate">პასუხები</span>
                  {answersCountForDate > 0 && (
                    <span className=" text-brass-soft px-1.5 py-0.5 text-[12px] font-bold shrink-0">
                      {answersCountForDate}
                    </span>
                  )}
                </button>

                {/* 3. მასალები */}
                <button
                  type="button"
                  onClick={() => setActiveTab('materials')}
                  className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center ${
                    activeTab === 'materials'
                      ? 'bg-surface text-ink shadow-inner border-hairline/80'
                      : 'bg-transparent border-transparent text-body hover:text-ink'
                  }`}>
                  <span className="truncate">მასალები</span>
                  {materialsCountForDate > 0 && (
                    <span className=" text-brass-soft px-1.5 py-0.5 text-[12px] font-bold shrink-0">
                      {materialsCountForDate}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* მასალების ატვირთვის ღილაკი */}
            {activeTab === 'materials' && activeStudent && (
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-navy text-white text-xs font-bold shadow-xs hover:bg-navy-strong active:scale-98 transition-all cursor-pointer">
                <UploadCloud className="size-3.5 text-white/90" />
                <span>მასალის ატვირთვა</span>
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col bg-navy-tint/20 min-h-0 p-3.5 sm:p-5">
            {/* ბარათების Grid სექცია */}
            <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
              {!activeStudent ? (
                <div className="py-24 flex flex-col items-center justify-center text-center text-muted">
                  <Users className="size-12 opacity-50 mb-3 text-brass/50" />
                  <p className="text-base font-bold text-ink">მოსწავლე არ არის არჩეული</p>
                  <p className="text-xs max-w-xs mt-1 text-muted">
                    აირჩიეთ მოსწავლე ზედა ტაბებიდან, რათა შეამოწმოთ მისი პასუხები.
                  </p>
                </div>
              ) : filteredTabAssignments.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-muted ">
                  {activeTab === 'tasks' ? (
                    <>
                      <BookOpen className="size-9 opacity-50 mb-2 text-brass/50" />
                      <p className="text-sm font-bold text-ink">ამ თარიღისთვის დავალებები არ არის</p>
                    </>
                  ) : activeTab === 'answers' ? (
                    <>
                      <CheckCircle2 className="size-9 opacity-80 mb-2 text-emerald-500/50" />
                      <p className="text-sm font-bold text-ink">მოსწავლის პასუხები ჯერ არ არის მიღებული</p>
                    </>
                  ) : (
                    <>
                      <Layers className="size-9 opacity-70 mb-2 text-orange-500/50" />
                      <p className="text-sm font-bold text-ink">სასწავლო მასალები არ არის ატვირთული</p>
                      <button
                        type="button"
                        onClick={() => setIsMaterialModalOpen(true)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 px-4 py-2 text-xs font-bold text-orange-500 hover:bg-orange-500/25 transition-colors shadow-inner">
                        <UploadCloud className="size-3.5" />
                        <span>ატვირთეთ პირველი მასალა</span>
                      </button>
                    </>
                  )}
                  <p className="text-xs max-w-xs mt-1 text-muted">
                    {formattedSelectedDate}-ს ამ სექციაში მონაცემები არ მოიძებნა.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {filteredTabAssignments.map((assignment) => {
                    const isGraded = assignment.status === 'GRADED' || assignment.status === 'RETURNED';
                    const isSubmitted = assignment.status === 'SUBMITTED' || Boolean(assignment.studentAttachmentUrl);
                    const isMaterial = isMaterialItem(assignment);

                    const displayImageUrl =
                      activeTab === 'answers' && assignment.studentAttachmentUrl
                        ? extractFirstImageUrl(assignment.studentAttachmentUrl)
                        : extractFirstImageUrl(assignment.problemImageUrl) ||
                          extractFirstImageUrl(assignment.promptTex);

                    const isPdfOrDoc =
                      Boolean(assignment.problemImageUrl) && isDocumentString(assignment.problemImageUrl);

                    return (
                      <div
                        key={assignment.id}
                        onClick={() => {
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
                        className={`flex flex-col justify-between rounded-2xl border p-3 transition-colors cursor-pointer group min-h-[210px] ${
                          isMaterial
                            ? ' bg-surface border-transparent hover:border-brass-extra/40'
                            : isGraded
                              ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                              : 'border-hairline bg-surface hover:border-orange-500/40 hover:bg-surface/80'
                        }`}>
                        <div className="flex flex-col gap-2 min-w-0">
                          {/* ზედა ბეიჯები */}
                          <div className="flex items-center justify-between gap-1.5">
                            {isGraded ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                <CheckCircle2 className="size-3" /> ჩაბარებულია
                              </span>
                            ) : isSubmitted ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-win bg-win-tint px-2 py-0.5 rounded-md border border-win/30 truncate">
                                <span className="size-1.5 rounded-full bg-win" />
                                პასუხი მიღებულია
                              </span>
                            ) : null}
                          </div>

                          {/* ფაილის / სურათის პრევიუ */}
                          {displayImageUrl ? (
                            <div className="w-full h-32 rounded-xl border border-hairline/50 bg-black/40 p-1.5 flex items-center justify-center overflow-hidden shadow-inner">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={displayImageUrl}
                                alt="დავალების სურათი"
                                className="w-full h-full object-contain rounded bg-transparent"
                              />
                            </div>
                          ) : isPdfOrDoc ? (
                            <div className="w-full h-32 rounded-xl bg-paper-deep border border-hairline p-3 flex flex-col items-center justify-center text-center transition-colors group-hover:border-orange-500/30">
                              <FileText className="size-9 text-orange-500 mb-1.5 opacity-80" />
                              <p className="text-xs font-bold text-ink line-clamp-1">{assignment.title}</p>
                              <span className="text-[10px] font-semibold text-orange-500 mt-1 opacity-80">
                                ფაილის გახსნა ↗
                              </span>
                            </div>
                          ) : assignment.promptTex ? (
                            <div className="w-full h-32 rounded-xl bg-paper-deep border border-hairline/50 p-3 flex items-center justify-center overflow-hidden">
                              <KatexPreview
                                tex={assignment.promptTex}
                                className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
                              />
                            </div>
                          ) : isMaterial ? (
                            <div className="w-full h-32 rounded-xl bg-paper-deep border border-hairline p-3 flex flex-col items-center justify-center text-center transition-colors group-hover:border-orange-500/30">
                              <Layers className="size-9 text-orange-500 mb-1.5 opacity-80" />
                              <p className="text-xs font-bold text-ink line-clamp-1">{assignment.title}</p>
                              <span className="text-[10px] font-semibold text-orange-500 mt-1 opacity-80">
                                მასალის გახსნა ↗
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* ქვედა ზოლი */}
                        <div className="flex items-center justify-between pt-2 border-t border-hairline/50">
                          <span className="text-xs font-bold text-body group-hover:text-orange-400 flex items-center gap-1 transition-colors">
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
                            className="flex size-7 items-center justify-center rounded-lg border border-transparent bg-transparent text-muted hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !assigning && setIsAssignModalOpen(false)}>
          <div
            className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-hairline bg-surface px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-navy/15 text-navy">
                  <Send className="size-3.5" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink">დავალების გადაცემა</h3>
                  <span className="text-xs text-muted">/ {activeStudent.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="flex size-7 items-center justify-center bg-surface/50 text-muted hover:bg-paper-deep hover:text-ink transition-colors cursor-pointer">
                <X className="size-3.5" />
              </button>
            </div>

            {/* 2-Column Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              {/* Left Col: Media Dropzone / Cards */}
              <div className="md:col-span-7 border-b md:border-b-0 md:border-r border-hairline p-5 bg-paper/40 flex flex-col justify-center">
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
                  <div className="relative group overflow-hidden rounded-xl border border-hairline bg-surface shadow-inner">
                    <img src={assignImage} alt="Attachment" className="w-full h-52 object-contain bg-black/20" />
                    <div className="absolute inset-x-0 bottom-0 bg-surface/90 backdrop-blur-xs border-t border-hairline px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-mono font-medium text-ink truncate max-w-[200px]">
                        {assignImageName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignImage(null);
                          setAssignImageName(null);
                        }}
                        className="text-rose-500 hover:text-rose-400 p-1 rounded-md transition-colors cursor-pointer">
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => assignFileRef.current?.click()}
                    className="group flex flex-col items-center justify-center gap-2.5 h-52 rounded-xl border-2 border-dashed border-hairline/80 bg-surface/30 hover:border-navy hover:bg-surface/80 transition-all cursor-pointer">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-paper-deep text-muted group-hover:bg-navy group-hover:text-white transition-all shadow-2xs">
                      <UploadCloud className="size-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-ink group-hover:text-navy transition-colors">
                        ატვირთეთ დავალების სურათი
                      </p>
                      <span className="text-[10px] font-mono text-muted">PNG, JPG, WEBP (მაქს. 10MB)</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Right Col: Details & Submission */}
              <div className="md:col-span-5 p-5 flex flex-col justify-between bg-surface/20">
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brass-strong block">
                    ინსტრუქცია მოსწავლეს
                  </span>
                  <textarea
                    value={assignComment}
                    onChange={(e) => setAssignComment(e.target.value)}
                    placeholder="ჩაწერეთ მითითება ან კითხვა ამოცანის ირგვლივ..."
                    className="w-full resize-none rounded-xl border border-hairline bg-surface p-3 text-xs text-ink placeholder:text-muted/70 outline-none focus:border-navy transition-colors"
                    rows={5}
                  />
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isSendDisabled || assigning}
                    onClick={handleSendProblemToStudent}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-navy-strong disabled:opacity-40 transition-all active:scale-98 cursor-pointer">
                    {assigning ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
                    <span>გაგზავნა დავალებებში</span>
                  </button>
                  <button
                    type="button"
                    disabled={assigning}
                    onClick={() => setIsAssignModalOpen(false)}
                    className="w-full py-1.5 text-center text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer">
                    გაუქმება
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. სასწავლო მასალის ატვირთვის მოდალი */}
      {isMaterialModalOpen && activeStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !uploadingMaterial && setIsMaterialModalOpen(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-5 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-navy/15 text-navy">
                  <Layers className="size-3.5" />
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink truncate">მასალის ატვირთვა</h3>
                  <span className="text-[11px] text-muted shrink-0">/ {activeStudent.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMaterialModalOpen(false)}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-hairline/80 bg-surface/50 text-muted hover:bg-paper-deep hover:text-ink transition-colors cursor-pointer">
                <X className="size-3.5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              {/* სათაურის ველი */}
              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">მასალის სათაური</label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="მაგ: თეორიული მასალა (გეომეტრია)"
                  className="w-full rounded-xl border border-hairline bg-surface/60 px-3.5 py-2 text-xs font-medium text-ink placeholder:text-muted outline-none focus:border-navy focus:bg-surface transition-all"
                />
              </div>

              {/* ფაილის არჩევა */}
              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">ფაილი</label>
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
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-2.5 shadow-2xs">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink truncate">{materialFileName}</p>
                      <span className="text-[10px] font-mono text-win">მზადაა ასატვირთად</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMaterialFileBase64(null);
                        setMaterialFileName(null);
                        setMaterialFileType(null);
                      }}
                      className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => materialFileInputRef.current?.click()}
                    className="group w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-hairline hover:border-navy bg-surface/40 hover:bg-surface/80 py-6 text-xs transition-all cursor-pointer">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-paper-deep text-muted group-hover:bg-navy/10 group-hover:text-navy transition-colors">
                      <UploadCloud className="size-4" />
                    </div>
                    <span className="font-semibold text-muted group-hover:text-ink transition-colors">
                      დააწკაპუნეთ ფაილის ასარჩევად
                    </span>
                    <span className="text-[10px] font-mono text-muted/60">PDF, DOCX, TXT, PNG, JPG</span>
                  </button>
                )}
              </div>

              {/* შენიშვნა */}
              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">
                  შენიშვნა / კომენტარი <span className="text-muted font-normal">(არასავალდებულო)</span>
                </label>
                <textarea
                  value={materialNote}
                  onChange={(e) => setMaterialNote(e.target.value)}
                  placeholder="ჩაწერეთ მითითება ამ მასალისთვის..."
                  className="w-full resize-none rounded-xl border border-hairline bg-surface/60 p-3 text-xs text-ink placeholder:text-muted outline-none focus:border-navy focus:bg-surface transition-colors"
                  rows={2}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-hairline bg-surface px-5 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={uploadingMaterial}
                onClick={() => setIsMaterialModalOpen(false)}
                className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-body hover:text-ink hover:bg-paper-deep transition-colors cursor-pointer disabled:opacity-50">
                გაუქმება
              </button>
              <button
                type="button"
                disabled={uploadingMaterial || !materialFileBase64}
                onClick={handleUploadMaterial}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-navy-strong disabled:opacity-40 transition-all active:scale-98 cursor-pointer">
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

      {/* 5. მასალის ნახვის მოდალი */}
      {previewMaterialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setPreviewMaterialModal(null)}>
          <div
            className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-surface px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-navy" />
                <h3 className="text-xs font-bold text-ink">{previewMaterialModal.title || 'სასწავლო მასალის დაფა'}</h3>
              </div>
              <button type="button" onClick={() => setPreviewMaterialModal(null)} className="text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 bg-[#161512] p-4 flex items-center justify-center overflow-hidden">
              <div className="rounded-xl border border-[#363431] bg-white p-2 shadow-2xl max-h-full max-w-full flex items-center justify-center">
                <img
                  src={previewMaterialModal.url}
                  alt="Material View"
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-hairline bg-surface px-5 py-2.5">
              <span className="text-[11px] font-mono text-muted">
                {previewMaterialModal.instructions && previewMaterialModal.instructions !== 'მასალა'
                  ? previewMaterialModal.instructions
                  : 'სრული ზომის გადახედვა'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewMaterialModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-hairline bg-paper-deep px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface transition-colors">
                  ახალ ჩანართში გახსნა
                </a>
                <a
                  href={previewMaterialModal.url}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-1.5 text-xs font-bold text-white hover:bg-navy-strong shadow-xs transition-all active:scale-98">
                  <Download className="size-3.5" />
                  <span>გადმოწერა</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. დავალების წაშლის მოდალი */}
      {deletingAssignmentId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !isDeleting && setDeletingAssignmentId(null)}>
          <div
            className="w-full max-w-sm rounded-3xl border border-hairline bg-paper p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-ink">წაშლა</h4>
                <p className="text-xs text-muted mt-0.5">ეს ქმედება შეუქცევადია</p>
              </div>
            </div>

            <p className="mt-4 rounded-xl border border-hairline bg-surface p-3 text-sm leading-relaxed text-body">
              დარწმუნებული ხართ, რომ გსურთ ამ ჩანაწერის წაშლა?
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingAssignmentId(null)}
                className="w-full sm:w-auto rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm font-bold text-ink hover:bg-paper-deep transition-colors disabled:opacity-50">
                გაუქმება
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-500/25 disabled:opacity-50 transition-colors shadow-inner active:scale-95">
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
