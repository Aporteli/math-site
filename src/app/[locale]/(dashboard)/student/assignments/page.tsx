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
  MessageSquare,
  Lock,
  Filter,
  ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { PageHero } from '@/components/ui/page-hero';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getStudentAssignmentsAction, getStudentCoursesAction, type StudentCourse } from '@/lib/actions/students';
import { submitStudentHomeworkAction, withdrawStudentHomeworkAction } from '@/lib/actions/student-submission';
import { ProblemDetailModal } from '@/components/lms/ProblemDetailModal';
import { StudentCourseVideoCallButton } from '@/components/lms/student/StudentCourseVideoCallButton';
import { convertPdfToImages } from '@/lib/pdf-helpers';
import { KatexPreview } from '@/components/math/katex-preview';

type Difficulty = 'easy' | 'medium' | 'hard' | 'olympiad';
type ProblemStatus = 'notStarted' | 'uploaded' | 'submitted' | 'graded';

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
  course: string;
  dueLabel?: string;
  createdAt?: string;
  publishedAt?: string;
  overdue?: boolean;
  note?: string;
  instructions?: string;
  attachmentUrl?: string | null;
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

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; badge: string }> = {
  easy: {
    label: 'მარტივი',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  medium: {
    label: 'საშუალო',
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  hard: {
    label: 'რთული',
    badge: 'bg-rose-50 text-rose-800 border-rose-300',
  },
  olympiad: {
    label: 'ოლიმპიადური',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-300',
  },
};

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

export default function StudentAssignments({ locale }: StudentAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
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

  const todayAssignments = useMemo(() => {
    return assignments.filter((a) => parseAndFormatDate(a).key === selectedDateKey);
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
    const combinedUrls = JSON.stringify(files.map((a) => a.url));
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
    setNotice('ჯგუფის პასუხები წარმატებით გაიგზავნა!');
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

      setNotice('პასუხები წარმატებით წაიშალა და დაბრუნდა სამუშაო რეჟიმში.');
      setTimeout(() => setNotice(null), 3500);
    } else {
      alert('შეცდომა: ' + (res.error || 'პასუხების წაშლა ვერ მოხერხდა'));
    }

    setWithdrawingDateKey(null);
  }

  function updateProblem(
    assignmentId: string,
    problemId: string,
    updater: (problem: AssignmentProblem) => AssignmentProblem,
  ) {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id !== assignmentId
          ? assignment
          : {
              ...assignment,
              problems: assignment.problems.map((problem) => (problem.id !== problemId ? problem : updater(problem))),
            },
      ),
    );
  }

  function handleRemoveFile(assignmentId: string, problemId: string) {
    updateProblem(assignmentId, problemId, (problem) => ({
      ...problem,
      status: 'notStarted',
      fileName: undefined,
      previewUrl: undefined,
    }));
  }

  async function handleMarkSubmitted(assignmentId: string, problemId: string) {
    const assignment = assignments.find((a) => a.id === assignmentId);
    const problem = assignment?.problems.find((p) => p.id === problemId);
    if (!assignment || !problem?.previewUrl) return;

    const res = await submitStudentHomeworkAction({
      assignmentId: assignment.id,
      attachmentUrl: problem.previewUrl,
    });

    if (res.success) {
      updateProblem(assignmentId, problemId, (p) => ({ ...p, status: 'submitted' }));
      setNotice('დავალება წარმატებით გაიგზავნა!');
      setTimeout(() => setNotice(null), 3500);
    } else {
      alert('გაგზავნა ვერ მოხერხდა');
    }
  }

  async function handleWithdrawSingle(assignmentId: string, problemId: string) {
    const res = await withdrawStudentHomeworkAction({ assignmentIds: [assignmentId] });
    if (res.success) {
      updateProblem(assignmentId, problemId, (problem) => ({
        ...problem,
        status: 'notStarted',
        previewUrl: undefined,
        fileName: undefined,
      }));
      setSubmittedDateGroups((prev) => ({
        ...prev,
        [selectedDateKey]: false,
      }));
      setNotice('დავალება დაბრუნდა ჩასასწორებლად');
      setTimeout(() => setNotice(null), 3500);
    }
  }

  const currentGroupFiles = dateGroupAttachments[selectedDateKey] || [];
  const isUploading = uploadingDateKey === selectedDateKey;
  const isSubmitting = submittingDateKey === selectedDateKey;
  const isWithdrawing = withdrawingDateKey === selectedDateKey;

  const isGroupAlreadySubmitted =
    submittedDateGroups[selectedDateKey] ||
    (assignmentsForSelectedDate.length > 0 &&
      assignmentsForSelectedDate.every((a) =>
        a.problems.every((p) => p.status === 'submitted' || p.status === 'graded'),
      ));

  return (
    <div className="space-y-6">
      <PageHero
        icon={ClipboardList}
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        aside={
          <div className="flex w-full flex-col gap-2.5">
            {/* 🌟 დღის ჯგუფური სტატუსის ერთიანი, სუფთა ბარათი (3-ფაზიანი ლოგიკა) 🌟 */}
            <div className={`rounded-2xl border px-4 py-3 shadow-xs transition-all ${
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

            {/* ვიდეო გაკვეთილის ღილაკი */}
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

      <div className="grid gap-5 lg:h-[calc(100vh-14rem)] lg:min-h-[38rem] lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-stretch">
        {/* სვეტი 1: ფილტრები (რიცხვების გარეშე) */}
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
          <div className="flex-1 flex flex-col min-h-0 p-5">
            <div className="border-b border-hairline pb-4">
              <h3 className="text-base font-bold text-ink">დავალებები</h3>
              <p className="text-xs text-muted mt-0.5">ყოველდღიური დავალებები და ამოცანები</p>
            </div>

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

            {notice && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pt-4 pe-1 custom-scrollbar space-y-4">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-muted">
                  <Loader2 className="size-6 animate-spin text-navy" />
                  <span>იტვირთება...</span>
                </div>
              ) : assignmentsForSelectedDate.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-muted rounded-2xl border border-dashed border-hairline p-6 bg-paper/20">
                  <BookOpen className="size-9 opacity-30 mb-2" />
                  <p className="text-sm font-bold text-ink">ამ თარიღისთვის დავალებები არ არის</p>
                  <p className="text-xs max-w-xs mt-1">{formattedSelectedDate}-ს დავალებები არ მოიძებნა.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {assignmentsForSelectedDate.map((assignment) => {
                      const meta = assignmentStatusMeta(assignment);
                      const teacherNote = assignment.instructions || assignment.note;
                      const firstProblem = assignment.problems?.[0];
                      const firstProblemTex = firstProblem?.promptTex;

                      const customPayload = (assignment.customPayload as Record<string, unknown>) || {};
                      
                      const boardImageUrl =
                        extractFirstImageUrl(assignment.attachmentUrl) ||
                        extractFirstImageUrl(firstProblem?.teacherAttachmentUrl) ||
                        (typeof customPayload.imageUrl === 'string' ? extractFirstImageUrl(customPayload.imageUrl) : null) ||
                        (typeof customPayload.attachmentUrl === 'string' ? extractFirstImageUrl(customPayload.attachmentUrl) : null) ||
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
                          className={`flex flex-col justify-between gap-3.5 rounded-2xl border p-4 transition-all cursor-pointer group min-h-[280px] ${
                            isGraded
                              ? 'border-emerald-200 bg-emerald-50/20 shadow-xs'
                              : 'border-hairline bg-white hover:border-navy/40 hover:shadow-md'
                          }`}>
                          <div className="flex flex-1 flex-col gap-2.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] ${meta.className}`}>
                                <meta.icon className="size-3" />
                                <span>{meta.label}</span>
                              </span>
                            </div>

                            {boardImageUrl ? (
                              <div className="flex-1 min-h-[140px] rounded-xl border border-slate-800 bg-slate-950 p-3 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                                <span className="text-[10px] font-bold text-slate-400 self-start mb-1.5 flex items-center gap-1.5">
                                  <ImageIcon className="size-3 text-indigo-400" /> დაფა / ამოცანის სურათი
                                </span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={boardImageUrl}
                                  alt="დაფის ჩანაწერი"
                                  className="flex-1 w-full max-h-56 rounded-lg object-contain bg-slate-900/60 border border-slate-800/80"
                                />
                              </div>
                            ) : firstProblemTex ? (
                              <div className="flex-1 min-h-[140px] rounded-xl  bg-paper-deep p-4 flex flex-col justify-center overflow-x-auto custom-scrollbar">
                                <KatexPreview
                                  tex={firstProblemTex}
                                  className="text-sm text-ink leading-relaxed pointer-events-none"
                                />
                              </div>
                            ) : null}

                            {teacherNote &&
                              teacherNote.trim() !== '' &&
                              teacherNote.trim() !== 'გთხოვთ ამოხსნათ მოცემული ამოცანა.' && (
                                <div className="rounded-lg bg-amber-50/50 p-2.5 border border-amber-100/50">
                                  <p className="text-xs text-amber-900/70 line-clamp-2">
                                    <span className="font-bold text-amber-800/80 mr-1">შენიშვნა:</span>
                                    {teacherNote}
                                  </p>
                                </div>
                              )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-hairline-soft">
                            <span className="text-xs font-bold text-navy group-hover:underline flex items-center gap-1">
                              სრულად ნახვა{' '}
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4.5 shadow-2xs">
                    {isGroupAlreadySubmitted ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-1">
                        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span>ამ დღის პასუხები უკვე გაგზავნილია</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            disabled={isWithdrawing}
                            onClick={() => handleResetDateGroup(selectedDateKey, assignmentsForSelectedDate)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50">
                            {isWithdrawing ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3.5" />
                            )}
                            <span>პასუხის დაბრუნება (წაშლა)</span>
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
                              ატვირთეთ ფაილები მთლიანი დღის ({assignmentsForSelectedDate.length} დავალების)
                              პასუხებისთვის ერთად.
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
                                onClick={() => handleSubmitDateGroup(selectedDateKey, assignmentsForSelectedDate)}
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {activeProblemModal && (
        <ProblemDetailModal
          problem={activeProblemModal.problem}
          assignmentTitle={assignments.find((a) => a.id === activeProblemModal.assignmentId)?.title || 'დავალება'}
          onClose={() => setActiveProblemModal(null)}
          onFile={async (file) => {
            const base64 = await fileToBase64(file);
            updateProblem(activeProblemModal.assignmentId, activeProblemModal.problem.id, (problem) => ({
              ...problem,
              status: 'uploaded',
              fileName: file.name,
              previewUrl: base64,
            }));
            setActiveProblemModal((prev) =>
              prev
                ? {
                    ...prev,
                    problem: {
                      ...prev.problem,
                      status: 'uploaded',
                      fileName: file.name,
                      previewUrl: base64,
                    },
                  }
                : null,
            );
          }}
          onRemoveFile={() => {
            handleRemoveFile(activeProblemModal.assignmentId, activeProblemModal.problem.id);
            setActiveProblemModal((prev) =>
              prev
                ? {
                    ...prev,
                    problem: {
                      ...prev.problem,
                      status: 'notStarted',
                      fileName: undefined,
                      previewUrl: undefined,
                    },
                  }
                : null,
            );
          }}
          onMarkSubmitted={async () => {
            await handleMarkSubmitted(activeProblemModal.assignmentId, activeProblemModal.problem.id);
            setActiveProblemModal((prev) =>
              prev ? { ...prev, problem: { ...prev.problem, status: 'submitted' } } : null,
            );
          }}
          onWithdraw={async () => {
            await handleWithdrawSingle(activeProblemModal.assignmentId, activeProblemModal.problem.id);
            setActiveProblemModal(null);
          }}
        />
      )}
    </div>
  );
}