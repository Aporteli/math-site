'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  GraduationCap,
  Loader2,
  UploadCloud,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  BookOpen,
  Lock,
  Filter,
  ImageIcon,
  RotateCcw,
  Layers,
  ZoomIn,
  FileText,
  Download,
} from 'lucide-react';
import { PageHero } from '@/components/ui/page-hero';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getStudentAssignmentsAction, getStudentCoursesAction, type StudentCourse } from '@/lib/actions/students';
import { submitStudentHomeworkAction, withdrawStudentHomeworkAction } from '@/lib/actions/student-submission';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { ProblemDetailModal } from '@/components/lms/ProblemDetailModal';
import { StudentCourseVideoCallButton } from '@/components/lms/student/StudentCourseVideoCallButton';
import { convertPdfToImages } from '@/lib/pdf-helpers';
import { KatexPreview } from '@/components/math/katex-preview';

type Difficulty = 'easy' | 'medium' | 'hard' | 'olympiad';
type ProblemStatus = 'notStarted' | 'uploaded' | 'submitted' | 'graded';
type StudentContentTab = 'tasks' | 'answers' | 'materials';

type AssignmentProblem = {
  id: string;
  promptTex: string;
  topic: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  fileName?: string;
  previewUrl?: string;
  teacherAttachmentUrl?: string | null;
  grade?: number;
  feedback?: string;
};

type Assignment = {
  id: string;
  title: string;
  type?: string;
  course: string;
  dueLabel?: string;
  createdAt?: string;
  publishedAt?: string;
  overdue?: boolean;
  note?: string;
  instructions?: string;
  attachmentUrl?: string | null;
  problemImageUrl?: string | null;
  customPayload?: any;
  problems: AssignmentProblem[];
};

type FilterStatus = 'all' | 'notStarted' | 'inProgress' | 'submitted';

interface StudentAssignmentsProps {
  locale: Locale;
}

const GEORGIAN_MONTHS = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];

function formatGeorgianDateString(d: Date): string {
  const day = d.getDate();
  const month = GEORGIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

function progressOf(assignment: Assignment) {
  const total = assignment.problems.length;
  const done = assignment.problems.filter((p) => p.status === 'submitted' || p.status === 'graded').length;
  const graded = assignment.problems.filter((p) => p.status === 'graded').length;
  return { done, graded, total };
}

function assignmentStatusMeta(assignment: Assignment): {
  id: 'graded' | 'submitted' | 'overdue' | 'notStarted';
  label: string;
  className: string;
  icon: LucideIcon;
} {
  const { done, total, graded } = progressOf(assignment);

  if (total > 0 && graded === total) {
    return {
      id: 'graded',
      label: 'ჩაბარებულია',
      icon: GraduationCap,
      className: 'border border-emerald-200 bg-emerald-100 text-emerald-700 font-bold',
    };
  }
  if (total > 0 && done === total) {
    return {
      id: 'submitted',
      label: 'გაგზავნილია',
      icon: Clock,
      className: 'border border-blue-200 bg-blue-100 text-blue-700 font-bold',
    };
  }
  if (assignment.overdue) {
    return {
      id: 'overdue',
      label: 'ვადაგასული',
      icon: Clock,
      className: 'border border-rose-200 bg-rose-50 text-rose-700 font-bold',
    };
  }

  return {
    id: 'notStarted',
    label: 'შესასრულებელი',
    icon: Circle,
    className: 'border border-hairline bg-paper text-muted',
  };
}

function matchesFilter(assignment: Assignment, status: FilterStatus) {
  if (status === 'all') return true;
  const { done, total } = progressOf(assignment);
  if (status === 'submitted') return total > 0 && done === total;
  if (status === 'notStarted') return done === 0;
  return done > 0 && done < total;
}

const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'ყველა' },
  { id: 'notStarted', label: 'შესასრულებელი' },
  { id: 'submitted', label: 'გაგზავნილი' },
];

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

function parseAndFormatDate(assignment: Assignment): { key: string; label: string; isToday: boolean } {
  let targetDate: Date | null = null;

  if (assignment.createdAt) {
    const d = new Date(assignment.createdAt);
    if (!isNaN(d.getTime())) targetDate = d;
  }

  if (!targetDate && assignment.publishedAt) {
    const d = new Date(assignment.publishedAt);
    if (!isNaN(d.getTime())) targetDate = d;
  }

  if (!targetDate) {
    targetDate = new Date();
  }

  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  const key = formatDateToKey(targetDate);
  const label = formatGeorgianDateString(targetDate);

  return { key, label, isToday };
}

function isImageString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.toLowerCase().trim();

  // თუ ფაილი PDF ან სხვა დოკუმენტია, სურათად არ ჩაითვალოს
  if (trimmed.endsWith('.pdf') || trimmed.endsWith('.txt') || trimmed.endsWith('.docx') || trimmed.endsWith('.doc')) {
    return false;
  }

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

function extractImageUrls(raw?: string | null): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && isImageString(x));
      }
    } catch {
      // ignore
    }
  }

  if (isImageString(trimmed)) {
    return [trimmed];
  }

  return [];
}

function extractFirstImageUrl(raw?: string | null): string | null {
  const urls = extractImageUrls(raw);
  return urls.length > 0 ? urls[0] : null;
}

function isAssignmentMaterial(a: Assignment): boolean {
  // Only treat an item as a study material when it was explicitly sent as one.
  // Tasks ("დავალებები") must never be re-classified as materials just because
  // they contain problem text or an image / board snapshot.
  const problemId =
    typeof a.customPayload?.problemId === 'string' ? a.customPayload.problemId : '';
  const instructions = (a.instructions ?? '').trim().toLowerCase();
  const note = (a.note ?? '').trim().toLowerCase();

  return (
    a.type === 'MATERIAL' ||
    problemId.startsWith('mat-') ||
    instructions === 'მასალა' ||
    instructions.startsWith('მასალა:') ||
    note === 'მასალა' ||
    note.startsWith('მასალა:')
  );
}

export default function StudentAssignments({ locale }: StudentAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [activeTab, setActiveTab] = useState<StudentContentTab>('tasks');
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateToKey(new Date()));

  const [dateGroupAttachments, setDateGroupAttachments] = useState<
    Record<string, { id: string; fileName: string; url: string }[]>
  >({});
  const [submittedDateGroups, setSubmittedDateGroups] = useState<Record<string, boolean>>({});
  const [uploadingDateKey, setUploadingDateKey] = useState<string | null>(null);
  const [submittingDateKey, setSubmittingDateKey] = useState<string | null>(null);
  const [withdrawingDateKey, setWithdrawingDateKey] = useState<string | null>(null);

  const [activeProblemModal, setActiveProblemModal] = useState<{
    assignmentId: string;
    problem: AssignmentProblem;
  } | null>(null);

  // 🌟 მასალის / პასუხის ნახვის მოდალის State
  const [previewMaterialModal, setPreviewMaterialModal] = useState<{
    url: string;
    title: string;
    isAnswer?: boolean;
    instructions?: string | null;
  } | null>(null);

  const dict = getDictionary(locale);
  const copy = dict.studentAssignments;

  async function loadData() {
    setLoading(true);
    const data = await getStudentAssignmentsAction();
    setAssignments(data as any);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    let active = true;
    getStudentCoursesAction().then((data) => {
      if (active) setCourses(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      set.add(parseAndFormatDate(a).key);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [assignments]);

  useEffect(() => {
    if (availableDates.length > 0) {
      const todayKey = formatDateToKey(new Date());
      if (!availableDates.includes(todayKey)) {
        setSelectedDateKey(availableDates[0]);
      }
    }
  }, [availableDates]);

  const handleShiftDate = (days: number) => {
    const parts = selectedDateKey.split('-');
    const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    current.setDate(current.getDate() + days);
    setSelectedDateKey(formatDateToKey(current));
  };

  const formattedSelectedDate = useMemo(() => {
    const parts = selectedDateKey.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return formatGeorgianDateString(d);
  }, [selectedDateKey]);

  const assignmentsForSelectedDate = useMemo(() => {
    return assignments.filter((assignment) => {
      const { key } = parseAndFormatDate(assignment);
      if (key !== selectedDateKey) return false;

      return matchesFilter(assignment, statusFilter);
    });
  }, [assignments, selectedDateKey, statusFilter]);

  // 1. დავალებები (სრულიად გამორიცხავს მასალებს)
  const taskAssignments = useMemo(() => {
    return assignmentsForSelectedDate.filter((a) => !isAssignmentMaterial(a));
  }, [assignmentsForSelectedDate]);

  // 2. მოსწავლის მიერ გამოგზავნილი პასუხები
  const submittedAnswersForDate = useMemo(() => {
    const answers: { id: string; url: string; title: string; status: string }[] = [];
    taskAssignments.forEach((a) => {
      a.problems.forEach((p, idx) => {
        if (p.previewUrl) {
          const urls = extractImageUrls(p.previewUrl);
          urls.forEach((url, uIdx) => {
            answers.push({
              id: `${a.id}-${p.id}-${idx}-${uIdx}`,
              url,
              title: `${a.title} - პასუხი ${urls.length > 1 ? `#${uIdx + 1}` : ''}`,
              status: p.status,
            });
          });
        }
      });
    });
    return answers;
  }, [taskAssignments]);

  // 3. მხოლოდ სასწავლო მასალები
  const materialsForDate = useMemo(() => {
    return assignmentsForSelectedDate.filter((a) => isAssignmentMaterial(a));
  }, [assignmentsForSelectedDate]);

  const todayAssignments = useMemo(() => {
    return assignments.filter((a) => parseAndFormatDate(a).key === selectedDateKey && !isAssignmentMaterial(a));
  }, [assignments, selectedDateKey]);

  async function handleGroupFileUpload(dateKey: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingDateKey(dateKey);

    const newItems: { id: string; fileName: string; url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const pdfPages = await convertPdfToImages(file);
          pdfPages.forEach((page, idx) => {
            newItems.push({
              id: `grp-${Date.now()}-${idx}`,
              fileName: `${file.name} (${page.name})`,
              url: page.url,
            });
          });
        } catch (e) {
          console.error(e);
        }
      } else if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        newItems.push({ id: `grp-${Date.now()}-${i}`, fileName: file.name, url: base64 });
      }
    }

    setDateGroupAttachments((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), ...newItems],
    }));
    setUploadingDateKey(null);
  }

  function removeGroupAttachment(dateKey: string, attachmentId: string) {
    setDateGroupAttachments((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((x) => x.id !== attachmentId),
    }));
  }

  async function handleSubmitDateGroup(dateKey: string, items: Assignment[]) {
    const files = dateGroupAttachments[dateKey] || [];
    if (files.length === 0) return;

    setSubmittingDateKey(dateKey);

    let resolvedUrls: string[] = [];
    try {
      resolvedUrls = await Promise.all(
        files.map(async (a) => {
          const uploaded = await uploadImageToStorageAction({
            dataUrl: a.url,
            fileName: a.fileName,
          });
          if (!uploaded.success || !uploaded.url) {
            throw new Error('UPLOAD_FAILED');
          }
          return uploaded.url;
        }),
      );
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      alert('სურათის ატვირთვა ვერ მოხერხდა');
      setSubmittingDateKey(null);
      return;
    }
    const combinedUrls = JSON.stringify(resolvedUrls);
    const itemIds = new Set(items.map((i) => i.id));

    await Promise.all(
      items.map((assignment) =>
        submitStudentHomeworkAction({
          assignmentId: assignment.id,
          attachmentUrl: combinedUrls,
        }),
      ),
    );

    setAssignments((prev) =>
      prev.map((a) =>
        itemIds.has(a.id)
          ? {
              ...a,
              problems: a.problems.map((p) => ({
                ...p,
                status: 'submitted',
                previewUrl: combinedUrls,
              })),
            }
          : a,
      ),
    );

    setSubmittedDateGroups((prev) => ({
      ...prev,
      [dateKey]: true,
    }));

    setSubmittingDateKey(null);
    setNotice('პასუხები წარმატებით გაიგზავნა და გადავიდა „პასუხების“ ტაბში!');
    setActiveTab('answers');
    setTimeout(() => setNotice(null), 3500);
  }

  async function handleResetDateGroup(dateKey: string, items: Assignment[]) {
    const confirmed = confirm('დარწმუნებული ხართ, რომ გსურთ ამ დღის ყველა ატვირთული პასუხის დაბრუნება და წაშლა?');
    if (!confirmed) return;

    setWithdrawingDateKey(dateKey);
    const itemIds = items.map((i) => i.id);

    const res = await withdrawStudentHomeworkAction({ assignmentIds: itemIds });

    if (res.success) {
      setAssignments((prev) =>
        prev.map((a) =>
          itemIds.includes(a.id)
            ? {
                ...a,
                problems: a.problems.map((p) => ({
                  ...p,
                  status: 'notStarted',
                  previewUrl: undefined,
                  fileName: undefined,
                })),
              }
            : a,
        ),
      );

      setSubmittedDateGroups((prev) => ({
        ...prev,
        [dateKey]: false,
      }));
      setDateGroupAttachments((prev) => ({
        ...prev,
        [dateKey]: [],
      }));

      setNotice('პასუხები წარმატებით წაიშალა.');
      setActiveTab('tasks');
      setTimeout(() => setNotice(null), 3500);
    } else {
      alert('შეცდომა: ' + (res.error || 'პასუხების წაშლა ვერ მოხერხდა'));
    }

    setWithdrawingDateKey(null);
  }

  const currentGroupFiles = dateGroupAttachments[selectedDateKey] || [];
  const isUploading = uploadingDateKey === selectedDateKey;
  const isSubmitting = submittingDateKey === selectedDateKey;
  const isWithdrawing = withdrawingDateKey === selectedDateKey;

  const isGroupAlreadySubmitted =
    submittedDateGroups[selectedDateKey] ||
    (taskAssignments.length > 0 &&
      taskAssignments.every((a) => a.problems.every((p) => p.status === 'submitted' || p.status === 'graded')));

  return (
    <div className="space-y-6">
      <PageHero
        icon={ClipboardList}
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        aside={
          <div className="flex w-full flex-col gap-2.5">
            <div
              className={`rounded-2xl border px-4 py-3 shadow-xs transition-all ${
                todayAssignments.length === 0
                  ? 'border-slate-200 bg-slate-50/70 text-slate-600'
                  : isGroupAlreadySubmitted
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                    : 'border-amber-200 bg-amber-50/40 text-amber-900'
              }`}>
              <div className="mt-1 flex items-center gap-2">
                {todayAssignments.length === 0 ? (
                  <>
                    <BookOpen className="size-5 text-slate-400 shrink-0" />
                    <span className="text-base font-bold text-slate-600">დავალება არ არის</span>
                  </>
                ) : isGroupAlreadySubmitted ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <span className="text-base font-bold text-emerald-700">გაგზავნილია</span>
                  </>
                ) : (
                  <>
                    <Clock className="size-5 text-amber-500 shrink-0" />
                    <span className="text-base font-bold text-slate-800">შესასრულებელი</span>
                  </>
                )}
              </div>
            </div>

            {courses.length > 0 && (
              <div className="flex w-full flex-col gap-2 [&>*]:!w-full [&>*]:!flex [&>*]:!items-center [&>*]:!gap-2 [&_button:first-child]:!flex-1 [&_button:first-child]:!justify-center">
                {courses.map((course) => (
                  <StudentCourseVideoCallButton
                    key={course.id}
                    courseId={course.id}
                    courseTitle={course.title}
                    label={`ვიდეო გაკვეთილი`}
                    showFullscreen
                  />
                ))}
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
        {/* სვეტი 1: ფილტრები */}
        <aside className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <Filter className="size-4 text-navy" />
            <h3 className="text-sm font-bold text-ink">ფილტრები</h3>
          </div>

          <div className="pt-3 space-y-1.5">
            <div className="grid grid-cols-1 gap-2">
              {FILTERS.map((f) => {
                const isActive = statusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`flex items-center justify-between rounded-2xl p-3 text-xs font-bold transition-all text-left ${
                      isActive
                        ? 'bg-navy text-white shadow-sm ring-1 ring-navy'
                        : 'bg-paper/50 hover:bg-paper-deep text-ink/80'
                    }`}>
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* სვეტი 2: მოსწავლის სამუშაო სივრცე */}
        <section className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white shadow-sm overflow-hidden">
          {/* ზედა ზოლი 1: სათაური და კალენდარი */}
          <div className="bg-paper/30 border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">სამუშაო სივრცე</h3>
              <span className="rounded-lg bg-navy-tint px-2 py-0.5 text-[10px] font-bold text-navy border border-navy/10">
                {taskAssignments.length}
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0 bg-white px-2 py-1 rounded-xl border border-hairline shadow-2xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                title="წინა დღე"
                className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors shrink-0">
                <ChevronLeft className="size-4" />
              </button>

              <div className="flex items-center justify-center gap-1 px-1 flex-1 sm:flex-none">
                <CalendarIcon className="size-3.5 text-navy shrink-0" />
                <input
                  type="date"
                  value={selectedDateKey}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDateKey(e.target.value);
                  }}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer text-center"
                />
              </div>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                title="შემდეგი დღე"
                className="flex size-7 items-center justify-center rounded-lg hover:bg-paper text-slate-700 transition-colors shrink-0">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* ზედა ზოლი 2: სამი საკონტროლო ტაბი */}
          <div className="bg-paper/40 border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="w-full sm:w-auto p-1 bg-paper-deep rounded-2xl border border-hairline/80">
              <div className="grid grid-cols-3 sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                    activeTab === 'tasks'
                      ? 'bg-white text-navy shadow-xs ring-1 ring-black/5'
                      : 'text-muted hover:text-ink'
                  }`}>
                  <BookOpen className="size-3.5 shrink-0" />
                  <span className="truncate">დავალებები</span>
                  <span className="text-[10px] opacity-70 hidden sm:inline">({taskAssignments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('answers')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                    activeTab === 'answers'
                      ? 'bg-white text-navy shadow-xs ring-1 ring-black/5'
                      : 'text-muted hover:text-ink'
                  }`}>
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">პასუხები</span>
                  {submittedAnswersForDate.length > 0 && (
                    <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                      {submittedAnswersForDate.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('materials')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                    activeTab === 'materials'
                      ? 'bg-white text-navy shadow-xs ring-1 ring-black/5'
                      : 'text-muted hover:text-ink'
                  }`}>
                  <Layers className="size-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">მასალები</span>
                  {materialsForDate.length > 0 && (
                    <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                      {materialsForDate.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-xl border border-hairline shadow-2xs hidden sm:inline-block">
              {formattedSelectedDate}
            </span>
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-3.5 sm:p-5">
            {/* 1. დავალებების ტაბი */}
            {activeTab === 'tasks' && (
              <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-muted">
                    <Loader2 className="size-6 animate-spin text-navy" />
                    <span>იტვირთება...</span>
                  </div>
                ) : taskAssignments.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
                    <BookOpen className="size-9 opacity-30 mb-2" />
                    <p className="text-sm font-bold text-ink">ამ თარიღისთვის დავალებები არ არის</p>
                    <p className="text-xs max-w-xs mt-1">{formattedSelectedDate}-ს დავალებები არ მოიძებნა.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {taskAssignments.map((assignment) => {
                      const meta = assignmentStatusMeta(assignment);
                      const teacherNote = assignment.instructions || assignment.note;
                      const firstProblem = assignment.problems?.[0];
                      const firstProblemTex = firstProblem?.promptTex;

                      const customPayload = (assignment.customPayload as Record<string, unknown>) || {};

                      const boardImageUrl =
                        extractFirstImageUrl(assignment.attachmentUrl) ||
                        extractFirstImageUrl(firstProblem?.teacherAttachmentUrl) ||
                        (typeof customPayload.imageUrl === 'string'
                          ? extractFirstImageUrl(customPayload.imageUrl)
                          : null) ||
                        (typeof customPayload.attachmentUrl === 'string'
                          ? extractFirstImageUrl(customPayload.attachmentUrl)
                          : null) ||
                        extractFirstImageUrl(firstProblemTex);

                      const isGraded = meta.id === 'graded';

                      return (
                        <div
                          key={assignment.id}
                          onClick={() => {
                            if (firstProblem) {
                              setActiveProblemModal({
                                assignmentId: assignment.id,
                                problem: {
                                  ...firstProblem,
                                  teacherAttachmentUrl: boardImageUrl || firstProblem.teacherAttachmentUrl,
                                },
                              });
                            }
                          }}
                          className={`flex flex-col justify-between rounded-2xl border p-3 transition-all cursor-pointer group min-h-[210px] ${
                            isGraded
                              ? 'border-emerald-200 bg-emerald-50/20 shadow-xs'
                              : 'border-hairline bg-white hover:border-navy/40 hover:shadow-md'
                          }`}>
                          <div className="flex flex-col gap-2 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] ${meta.className}`}>
                                <meta.icon className="size-3" />
                                <span className="truncate">{meta.label}</span>
                              </span>
                            </div>

                            {boardImageUrl ? (
                              <div className="w-full h-32 rounded-xl border border-slate-800 bg-slate-950 p-1.5 flex items-center justify-center overflow-hidden shadow-inner">
                                <img
                                  src={boardImageUrl}
                                  alt="დაფის ჩანაწერი"
                                  className="w-full h-full object-contain rounded bg-slate-900/60"
                                />
                              </div>
                            ) : firstProblemTex ? (
                              <div className="w-full h-32 rounded-xl bg-paper-deep p-3 flex items-center justify-center overflow-hidden">
                                <KatexPreview
                                  tex={firstProblemTex}
                                  className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
                                />
                              </div>
                            ) : null}

                            {teacherNote &&
                              teacherNote.trim() !== '' &&
                              teacherNote.trim() !== 'გთხოვთ ამოხსნათ მოცემული ამოცანა.' && (
                                <div className="rounded-lg bg-amber-50/50 p-2 border border-amber-100/50">
                                  <p className="text-[11px] text-amber-900/70 line-clamp-2">
                                    <span className="font-bold text-amber-800/80 mr-1">შენიშვნა:</span>
                                    {teacherNote}
                                  </p>
                                </div>
                              )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-hairline-soft">
                            <span className="text-xs font-bold text-navy group-hover:underline flex items-center gap-1">
                              ნახვა <span className="transition-transform group-hover:translate-x-0.5">→</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. პასუხების ტაბი */}
            {activeTab === 'answers' && (
              <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
                {submittedAnswersForDate.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
                    <CheckCircle2 className="size-9 opacity-30 mb-2 text-emerald-600" />
                    <p className="text-sm font-bold text-ink">პასუხები ჯერ არ გაგიგზავნიათ</p>
                    <p className="text-xs max-w-xs mt-1">გამოიყენეთ ქვედა პანელი პასუხის ასატვირთად და გასაგზავნად.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {submittedAnswersForDate.map((ans) => (
                      <div
                        key={ans.id}
                        onClick={() =>
                          setPreviewMaterialModal({
                            url: ans.url,
                            title: ans.title,
                            isAnswer: true,
                          })
                        }
                        className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/20 p-3 transition-all cursor-pointer group shadow-2xs hover:shadow-md min-h-[210px]">
                        <div className="flex flex-col gap-2 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> ჩაბარებულია
                            </span>
                          </div>

                          <div className="w-full h-32 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden">
                            <img
                              src={ans.url}
                              alt="მოსწავლის პასუხი"
                              className="w-full h-full object-contain rounded"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                          <span className="text-xs font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
                            გადიდება <ZoomIn className="size-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. მასალების ტაბი */}
            {activeTab === 'materials' && (
              <div className="flex-1 overflow-y-auto pt-1 pe-1 custom-scrollbar">
                {materialsForDate.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
                    <Layers className="size-9 opacity-30 mb-2 text-indigo-500" />
                    <p className="text-sm font-bold text-ink">სასწავლო მასალები არ არის</p>
                    <p className="text-xs max-w-xs mt-1">ამ თარიღისთვის მასალები არ მოიძებნა.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {materialsForDate.map((mat) => {
                      const firstProb = mat.problems?.[0];
                      const promptText = firstProb?.promptTex || mat.instructions;

                      // 🌟 სწორი ლინკის ამოღება (სტრიქონია თუ JSON მასივი)
                      const rawFileUrl =
                        mat.attachmentUrl ||
                        mat.problemImageUrl ||
                        firstProb?.teacherAttachmentUrl ||
                        (typeof mat.customPayload?.imageUrl === 'string' ? mat.customPayload.imageUrl : null) ||
                        (typeof mat.customPayload?.attachmentUrl === 'string' ? mat.customPayload.attachmentUrl : null);

                      const fileUrl =
                        extractFirstImageUrl(rawFileUrl) || (typeof rawFileUrl === 'string' ? rawFileUrl.trim() : null);
                      const isImg = isImageString(fileUrl);
                      const isFile = Boolean(fileUrl) && !isImg;

                      return (
                        <div
                          key={mat.id}
                          onClick={() => {
                            if (fileUrl) {
                              setPreviewMaterialModal({
                                url: fileUrl,
                                title: mat.title,
                                isAnswer: false,
                                instructions: mat.instructions,
                              });
                            } else if (firstProb && firstProb.promptTex) {
                              setActiveProblemModal({
                                assignmentId: mat.id,
                                problem: firstProb,
                              });
                            }
                          }}
                          className="flex flex-col justify-between rounded-2xl border border-indigo-200 bg-indigo-50/20 p-3.5 transition-all cursor-pointer group hover:border-indigo-400 hover:shadow-md min-h-[210px]">
                          <div className="flex flex-col gap-2 min-w-0">
                            <span className="rounded-lg bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold self-start border border-indigo-200/60">
                              სასწავლო მასალა
                            </span>

                            {isImg && fileUrl ? (
                              <div className="w-full h-32 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden shadow-inner">
                                <img
                                  src={fileUrl}
                                  alt={mat.title}
                                  className="w-full h-full object-contain rounded"
                                  onError={(e) => {
                                    // თუ სურათი ფიზიკურად არ იტვირთება, ავტომატურად დაიმალოს გატეხილი აიქონი
                                    const target = e.target as HTMLElement;
                                    target.style.display = 'none';
                                    if (target.parentElement) {
                                      target.parentElement.innerHTML =
                                        '<div class="flex flex-col items-center justify-center text-indigo-600"><svg class="size-8 mb-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="text-[10px] font-bold">ფაილის ნახვა</span></div>';
                                    }
                                  }}
                                />
                              </div>
                            ) : isFile ? (
                              <div className="w-full h-32 rounded-xl bg-white border border-indigo-100 p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                                <FileText className="size-10 text-indigo-600 mb-1.5" />
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{mat.title}</p>
                                <span className="text-[10px] font-semibold text-indigo-600 mt-1">ფაილის გახსნა ↗</span>
                              </div>
                            ) : promptText ? (
                              <div className="w-full h-32 rounded-xl bg-paper-deep p-3 flex items-center justify-center overflow-hidden">
                                <KatexPreview
                                  tex={promptText}
                                  className="text-xs text-ink line-clamp-3 pointer-events-none leading-relaxed"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-xl bg-white border border-indigo-100 p-3 flex flex-col items-center justify-center text-center shadow-2xs">
                                <FileText className="size-10 text-indigo-600 mb-1.5" />
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{mat.title}</p>
                                <span className="text-[10px] font-semibold text-indigo-600 mt-1">ფაილის გახსნა ↗</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-indigo-100/70">
                            <span className="text-xs font-bold text-indigo-700 group-hover:underline flex items-center gap-1">
                              მასალის გახსნა <span className="transition-transform group-hover:translate-x-0.5">→</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ქვედა ნაწილი: ძირში ფიქსირებული პასუხების მიმაგრების პანელი */}
            {activeTab === 'tasks' && (
              <div className="shrink-0 mt-3 pt-3 border-t border-hairline">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-2xs">
                  {isGroupAlreadySubmitted ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        <span>ამ დღის პასუხები უკვე გაგზავნილია (იხილეთ „პასუხების“ ტაბში)</span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          disabled={isWithdrawing}
                          onClick={() => handleResetDateGroup(selectedDateKey, taskAssignments)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50">
                          {isWithdrawing ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          <span>პასუხის დაბრუნება</span>
                        </button>

                        <span className="inline-flex items-center gap-1 rounded-md bg-paper-deep px-2.5 py-1 text-[10px] font-semibold text-muted border border-slate-200 shrink-0">
                          <Lock className="size-3" />
                          <span>დახურულია</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-ink">ჯგუფური პასუხების მიმაგრება</h4>
                          <p className="text-[11px] text-muted mt-0.5">
                            ატვირთეთ ფაილები მთლიანი დღის ({taskAssignments.length} დავალების) პასუხებისთვის ერთად.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <label className="cursor-pointer flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-paper transition-colors shadow-2xs">
                            {isUploading ? (
                              <Loader2 className="size-3.5 animate-spin text-navy" />
                            ) : (
                              <UploadCloud className="size-3.5 text-navy" />
                            )}
                            <span>ფაილის არჩევა</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) =>
                                handleGroupFileUpload(selectedDateKey, e.target.files).finally(() => {
                                  e.target.value = '';
                                })
                              }
                            />
                          </label>

                          {currentGroupFiles.length > 0 && (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleSubmitDateGroup(selectedDateKey, taskAssignments)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-strong disabled:opacity-50 transition-colors shadow-xs">
                              {isSubmitting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Send className="size-3.5" />
                              )}
                              <span>გაგზავნა ({currentGroupFiles.length})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {currentGroupFiles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                          {currentGroupFiles.map((att) => (
                            <div
                              key={att.id}
                              className="group/thumb relative rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
                              <img src={att.url} alt="file" className="h-12 w-12 rounded-lg object-cover" />
                              <button
                                type="button"
                                onClick={() => removeGroupAttachment(selectedDateKey, att.id)}
                                className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
                                <X className="size-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
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

      {/* 🌟 მასალის / პასუხის ნახვის მოდალი — შესაბამისი აიკონით ჰედერში 🌟 */}
      {previewMaterialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewMaterialModal(null)}>
          <div
            className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                    previewMaterialModal.isAnswer ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                  {previewMaterialModal.isAnswer ? <CheckCircle2 className="size-5" /> : <Layers className="size-5" />}
                </div>
                <div className="min-w-0">
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

            <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
              {isImageString(previewMaterialModal.url) ? (
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
    </div>
  );
}
