'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  GraduationCap,
  Search,
  Loader2,
  UploadCloud,
  Calendar,
  ChevronDown,
  X,
  Send,
  BookOpen,
  ChevronRight,
  MessageSquare,
  Lock,
  Video,
} from 'lucide-react';
import { PageHero } from '@/components/ui/page-hero';
import { localePath, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getStudentAssignmentsAction, getStudentCoursesAction, type StudentCourse } from '@/lib/actions/students';
import { submitStudentHomeworkAction } from '@/lib/actions/student-submission';
import { ProblemDetailModal } from "@/components/lms/ProblemDetailModal";
import { StudentCourseVideoCallButton } from "@/components/lms/student/StudentCourseVideoCallButton";
import { convertPdfToImages } from "@/lib/pdf-helpers";

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
  problems: AssignmentProblem[];
};

type FilterStatus = 'all' | 'notStarted' | 'inProgress' | 'submitted' | 'graded';

interface StudentAssignmentsProps {
  locale: Locale;
  assignments?: Assignment[];
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; badge: string }
> = {
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

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10 transition-all';

const STUDENT_VIEWED_STORAGE_KEY = 'mathlab_student_viewed_assignment_groups_v1';

function progressOf(assignment: Assignment) {
  const total = assignment.problems.length;
  const done = assignment.problems.filter(
    (p) => p.status === 'submitted' || p.status === 'graded'
  ).length;
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
      className: 'border border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold',
    };
  }
  if (total > 0 && done === total) {
    return {
      id: 'submitted',
      label: 'გაგზავნილია',
      icon: Clock,
      className: 'border border-blue-400 bg-blue-50 text-blue-800 font-semibold',
    };
  }
  if (assignment.overdue) {
    return {
      id: 'overdue',
      label: 'ვადაგასული',
      icon: Clock,
      className: 'border border-rose-400 bg-rose-50 text-rose-800 font-semibold',
    };
  }

  return {
    id: 'notStarted',
    label: 'შესასრულებელი',
    icon: Circle,
    className: 'border border-slate-300 bg-paper text-muted',
  };
}

function matchesFilter(assignment: Assignment, status: FilterStatus) {
  if (status === 'all') return true;
  const { done, total, graded } = progressOf(assignment);
  if (status === 'graded') return total > 0 && graded === total;
  if (status === 'submitted') return total > 0 && done === total && graded < total;
  if (status === 'notStarted') return done === 0;
  return done > 0 && done < total;
}

const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'ყველა დავალება' },
  { id: 'notStarted', label: 'შესასრულებელი' },
  { id: 'submitted', label: 'გაგზავნილი' },
  { id: 'graded', label: 'ჩაბარებული' },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
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

  const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  
  const label = targetDate.toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return { key, label, isToday };
}

export default function StudentAssignments({
  locale,
  assignments: initialPropsAssignments,
}: StudentAssignmentsProps) {
  const baseId = useId();
  const [assignments, setAssignments] = useState<Assignment[]>(initialPropsAssignments || []);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialPropsAssignments);

  // localStorage-დან ჩატვირთული ნანახი თარიღების სია
  const [viewedDateKeys, setViewedDateKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STUDENT_VIEWED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setViewedDateKeys(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load student viewed groups from localStorage', e);
    }
  }, []);

  const [dateGroupAttachments, setDateGroupAttachments] = useState<
    Record<string, { id: string; fileName: string; url: string }[]>
  >({});
  const [submittedDateGroups, setSubmittedDateGroups] = useState<Record<string, boolean>>({});
  const [uploadingDateKey, setUploadingDateKey] = useState<string | null>(null);
  const [submittingDateKey, setSubmittingDateKey] = useState<string | null>(null);

  const [activeProblemModal, setActiveProblemModal] = useState<{
    assignmentId: string;
    problem: AssignmentProblem;
  } | null>(null);

  // საწყისად ჩაკეცილია ყველა თარიღი
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [courses, setCourses] = useState<StudentCourse[]>([]);

  const dict = getDictionary(locale);
  const copy = dict.studentAssignments;

  async function loadData() {
    setLoading(true);
    const data = await getStudentAssignmentsAction();
    setAssignments(data);
    setLoading(false);
  }

  useEffect(() => {
    if (initialPropsAssignments) {
      setAssignments(initialPropsAssignments);
      return;
    }
    void loadData();
  }, [initialPropsAssignments]);

  useEffect(() => {
    let active = true;
    getStudentCoursesAction().then((data) => {
      if (active) setCourses(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesQuery =
        q.length === 0 ||
        assignment.title.toLowerCase().includes(q) ||
        assignment.course.toLowerCase().includes(q);
      return matchesQuery && matchesFilter(assignment, statusFilter);
    });
  }, [assignments, query, statusFilter]);

  const groupedAssignments = useMemo(() => {
    const groupsMap = new Map<string, { dateKey: string; dateStr: string; items: Assignment[] }>();

    visible.forEach((a) => {
      const { key, label } = parseAndFormatDate(a);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { dateKey: key, dateStr: label, items: [] });
      }
      groupsMap.get(key)!.items.push(a);
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [visible]);

  // ჩამოშლისას თარიღი აღინიშნება როგორც ნანახი და ინახება localStorage-ში
  const toggleDate = (dateKey: string) => {
    const isCurrentlyCollapsed = collapsedDates[dateKey] ?? true;
    const willOpen = isCurrentlyCollapsed;

    setCollapsedDates((prev) => ({ ...prev, [dateKey]: !willOpen }));

    if (willOpen) {
      setViewedDateKeys((prev) => {
        const next = new Set([...prev, dateKey]);
        try {
          localStorage.setItem(STUDENT_VIEWED_STORAGE_KEY, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error('Failed to save student viewed groups', e);
        }
        return next;
      });
    }
  };

  // ამოწმებს, აქვს თუ არა სტუდენტს ახალი (ჩაუშლელი და შეუსრულებელი) დავალებები
  const hasUnreadOpenAssignments = useMemo(() => {
    return assignments.some((a) => {
      const { done, total } = progressOf(a);
      const isOpen = done < total;
      if (!isOpen) return false;

      const { key } = parseAndFormatDate(a);
      return !viewedDateKeys.has(key);
    });
  }, [assignments, viewedDateKeys]);

  const todayAssignments = useMemo(() => {
    return assignments.filter((a) => parseAndFormatDate(a).isToday);
  }, [assignments]);

  const openCount = useMemo(() => {
    return todayAssignments.filter((a) => {
      const { done, total } = progressOf(a);
      return done < total;
    }).length;
  }, [todayAssignments]);

  const submittedCount = useMemo(() => {
    return todayAssignments.filter((a) => {
      const { done, total, graded } = progressOf(a);
      return total > 0 && done === total && graded < total;
    }).length;
  }, [todayAssignments]);

  const gradedCount = useMemo(() => {
    return todayAssignments.filter((a) => {
      const { total, graded } = progressOf(a);
      return total > 0 && graded === total;
    }).length;
  }, [todayAssignments]);

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
        })
      )
    );

    setAssignments((prev) =>
      prev.map((a) =>
        itemIds.has(a.id)
          ? {
              ...a,
              problems: a.problems.map((p) => ({ ...p, status: 'submitted' })),
            }
          : a
      )
    );

    setSubmittedDateGroups((prev) => ({
      ...prev,
      [dateKey]: true,
    }));

    setSubmittingDateKey(null);
    setNotice('ჯგუფის პასუხები წარმატებით გაიგზავნა!');
    setTimeout(() => setNotice(null), 3500);
  }

  function updateProblem(
    assignmentId: string,
    problemId: string,
    updater: (problem: AssignmentProblem) => AssignmentProblem
  ) {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id !== assignmentId
          ? assignment
          : {
              ...assignment,
              problems: assignment.problems.map((problem) =>
                problem.id !== problemId ? problem : updater(problem)
              ),
            }
      )
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

  function handleWithdraw(assignmentId: string, problemId: string) {
    updateProblem(assignmentId, problemId, (problem) => ({ ...problem, status: 'uploaded' }));
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
      <PageHero
        icon={ClipboardList}
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        aside={
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-1">
              {/* 1. ღია */}
              <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">ღია</p>
                <p className="mt-0.5 text-xl font-bold text-ink">{openCount}</p>
              </div>

              {/* 2. გაგზავნილი */}
              <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">გაგზავნილი</p>
                <p className="mt-0.5 text-xl font-bold text-blue-700">{submittedCount}</p>
              </div>

              {/* 3. ჩაბარებული */}
              <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">ჩაბარებული</p>
                <p className="mt-0.5 text-xl font-bold text-emerald-700">{gradedCount}</p>
              </div>
            </div>

            {courses.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  <Video className="size-3.5" />
                  ვიდეო გაკვეთილი
                </p>
                <div className="flex flex-wrap gap-2">
                  {courses.map((course) => (
                    <StudentCourseVideoCallButton
                      key={course.id}
                      courseId={course.id}
                      courseTitle={course.title}
                      label={course.title}
                      showFullscreen
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)] xl:items-start">
        <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sticky top-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted border-b border-slate-100 pb-2.5">
            {copy.filters.title}
          </h2>

          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id={`${baseId}-search`}
                type="search"
                className={`${fieldClass} pl-9`}
                placeholder="ძიება..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="space-y-1 pt-1">
              {FILTERS.map((filter) => {
                const isActive = statusFilter === filter.id;
                const showBadgeOnFilter =
                  (filter.id === 'all' || filter.id === 'notStarted') && hasUnreadOpenAssignments;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setStatusFilter(filter.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-navy text-white shadow-xs'
                        : 'text-ink/80 hover:bg-paper hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{filter.label}</span>
                      {showBadgeOnFilter && (
                        <span className="size-2 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {(query || statusFilter !== 'all') && (
            <button
              type="button"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-paper py-1.5 text-[11px] font-bold text-muted hover:bg-paper-deep hover:text-ink transition-colors"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}
            >
              გასუფთავება
            </button>
          )}
        </aside>

        <main className="space-y-6 min-w-0">
          {notice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-muted bg-white rounded-2xl border border-slate-200">
              <Loader2 className="size-6 animate-spin text-navy" />
              <span>იტვირთება...</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 p-6">
              <ClipboardList className="size-10 text-muted/40 mb-2" />
              <p className="text-sm font-bold text-ink">{copy.list.emptyTitle}</p>
              <p className="mt-0.5 text-xs text-muted max-w-sm">{copy.list.emptyHint}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedAssignments.map(({ dateKey, dateStr, items }) => {
                const isCollapsed = collapsedDates[dateKey] ?? true;
                const currentGroupFiles = dateGroupAttachments[dateKey] || [];
                const isUploading = uploadingDateKey === dateKey;
                const isSubmitting = submittingDateKey === dateKey;
                const isGroupAlreadySubmitted =
                  submittedDateGroups[dateKey] ||
                  items.every((a) =>
                    a.problems.every((p) => p.status === 'submitted' || p.status === 'graded')
                  );

                // ახალი დავალების ინდიკატორი კონკრეტულ თარიღზე
                const isGroupUnread =
                  items.some((a) => {
                    const { done, total } = progressOf(a);
                    return done < total;
                  }) && !viewedDateKeys.has(dateKey);

                return (
                  <div
                    key={dateKey}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm"
                  >
                    <div
                      className="flex items-center justify-between border-b border-slate-200/80 bg-paper/60 px-5 py-3.5 cursor-pointer select-none group"
                      onClick={() => toggleDate(dateKey)}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="size-4 text-navy" />
                        <h3 className="text-sm font-bold text-ink group-hover:text-navy transition-colors">
                          {dateStr}
                        </h3>
                        <span className="rounded-md bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-300 shadow-2xs">
                          {items.length} დავალება
                        </span>
                        {/* ყვითელი ბურთულა მოსწავლისთვის */}
                        {isGroupUnread && (
                          <span className="size-2 rounded-full bg-amber-400 ring-2 ring-amber-100 animate-pulse shrink-0" />
                        )}
                      </div>

                      <ChevronDown
                        className={`size-4 text-muted transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </div>

                    {!isCollapsed && (
                      <div className="p-5 space-y-5 bg-slate-50/30">
                        <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-2">
                          {items.map((assignment) => {
                            const meta = assignmentStatusMeta(assignment);
                            const teacherNote = assignment.instructions || assignment.note;

                            return (
                              <div
                                key={assignment.id}
                                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:border-navy/40 hover:shadow-md"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                                    <div className="min-w-0 flex-1">
                                      <Link
                                        href={localePath(locale, '/student/courses')}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-navy"
                                      >
                                        <BookOpen className="size-3" />
                                        <span>{assignment.course}</span>
                                      </Link>
                                      <h4 className="text-sm font-bold text-ink truncate mt-0.5">
                                        {assignment.title}
                                      </h4>
                                    </div>

                                    <span
                                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] ${meta.className}`}
                                    >
                                      <meta.icon className="size-3" />
                                      <span>{meta.label}</span>
                                    </span>
                                  </div>

                                  {teacherNote && (
                                    <div className="mt-3.5 rounded-xl border border-amber-200/90 bg-amber-50/60 p-3 text-xs text-amber-950">
                                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
                                        <MessageSquare className="size-3" />
                                        <span>კომენტარი</span>
                                      </div>
                                      <p className="line-clamp-2 leading-relaxed">{teacherNote}</p>
                                    </div>
                                  )}

                                  <div className="mt-3.5 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      ამოცანები ({assignment.problems.length})
                                    </p>
                                    <div className="space-y-1.5">
                                      {assignment.problems.map((problem, pIdx) => {
                                        const diff = DIFFICULTY_CONFIG[problem.difficulty] || DIFFICULTY_CONFIG.medium;

                                        return (
                                          <button
                                            key={problem.id}
                                            type="button"
                                            onClick={() =>
                                              setActiveProblemModal({
                                                assignmentId: assignment.id,
                                                problem,
                                              })
                                            }
                                            className="group/item flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/60 px-3.5 py-2.5 text-left transition-all duration-150 hover:border-navy/40 hover:bg-white hover:shadow-xs"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="text-[11px] font-bold text-slate-400 w-3.5 shrink-0">
                                                {pIdx + 1}.
                                              </span>
                                              <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${diff.badge}`}>
                                                {diff.label}
                                              </span>
                                              <span className="truncate text-xs font-semibold text-ink group-hover/item:text-navy transition-colors">
                                                {problem.topic || `ამოცანა #${pIdx + 1}`}
                                              </span>
                                            </div>

                                            <ChevronRight className="size-3.5 text-slate-400 group-hover/item:text-navy group-hover/item:translate-x-0.5 transition-all shrink-0" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4.5 shadow-2xs">
                          {isGroupAlreadySubmitted ? (
                            <div className="flex items-center justify-between gap-3 text-xs font-bold text-muted py-1">
                              <div className="flex items-center gap-2 text-emerald-700">
                                <CheckCircle2 className="size-4 text-emerald-600" />
                                <span>ამ ჯგუფის პასუხები უკვე გაგზავნილია</span>
                              </div>
                              <span className="inline-flex items-center gap-1 rounded-md bg-paper-deep px-2.5 py-1 text-[10px] font-semibold text-muted border border-slate-200">
                                <Lock className="size-3" />
                                <span>დახურულია</span>
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-bold text-ink">
                                    ჯგუფური პასუხების მიმაგრება
                                  </h4>
                                  <p className="text-[11px] text-muted mt-0.5">
                                    ატვირთეთ ფაილები მთლიანი დღის ({items.length} დავალების) პასუხებისთვის ერთად.
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
                                        handleGroupFileUpload(dateKey, e.target.files).finally(() => {
                                          e.target.value = '';
                                        })
                                      }
                                    />
                                  </label>

                                  {currentGroupFiles.length > 0 && (
                                    <button
                                      type="button"
                                      disabled={isSubmitting}
                                      onClick={() => handleSubmitDateGroup(dateKey, items)}
                                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-strong disabled:opacity-50 transition-colors shadow-xs"
                                    >
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
                                      className="group/thumb relative rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={att.url}
                                        alt="file"
                                        className="h-12 w-12 rounded-lg object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeGroupAttachment(dateKey, att.id)}
                                        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs"
                                      >
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
                );
              })}
            </div>
          )}
        </main>
      </div>

      {activeProblemModal && (
        <ProblemDetailModal
          problem={activeProblemModal.problem}
          assignmentTitle={
            assignments.find((a) => a.id === activeProblemModal.assignmentId)?.title || 'დავალება'
          }
          onClose={() => setActiveProblemModal(null)}
          onFile={async (file) => {
            const base64 = await fileToBase64(file);
            updateProblem(
              activeProblemModal.assignmentId,
              activeProblemModal.problem.id,
              (problem) => ({
                ...problem,
                status: 'uploaded',
                fileName: file.name,
                previewUrl: base64,
              })
            );
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
                : null
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
                : null
            );
          }}
          onMarkSubmitted={async () => {
            await handleMarkSubmitted(
              activeProblemModal.assignmentId,
              activeProblemModal.problem.id
            );
            setActiveProblemModal((prev) =>
              prev ? { ...prev, problem: { ...prev.problem, status: 'submitted' } } : null
            );
          }}
          onWithdraw={() => {
            handleWithdraw(activeProblemModal.assignmentId, activeProblemModal.problem.id);
            setActiveProblemModal((prev) =>
              prev ? { ...prev, problem: { ...prev.problem, status: 'uploaded' } } : null
            );
          }}
        />
      )}
    </div>
  );
}