'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  GraduationCap,
  Search,
  Loader2,
} from 'lucide-react';
import { PageHero } from '@/components/ui/page-hero';
import { localePath, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getStudentAssignmentsAction } from '@/lib/actions/students';
import { submitStudentHomeworkAction } from '@/lib/actions/student-submission';
import { ProblemDetailModal } from "@/components/lms/ProblemDetailModal";

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
  dueLabel: string;
  overdue?: boolean;
  note?: string;
  instructions?: string; // დაემატა ინსტრუქციის ველი
  problems: AssignmentProblem[];
};

type FilterStatus = 'all' | 'notStarted' | 'inProgress' | 'submitted' | 'graded';

interface StudentAssignmentsProps {
  locale: Locale;
  assignments?: Assignment[];
}

const DIFFICULTY_TONE: Record<Difficulty, string> = {
  easy: 'bg-navy-tint text-navy',
  medium: 'bg-brass-tint text-brass-strong',
  hard: 'bg-navy text-white',
  olympiad: 'border border-brass/40 bg-white text-brass-strong',
};

const fieldClass =
  'w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

function progressOf(assignment: Assignment) {
  const total = assignment.problems.length;
  const done = assignment.problems.filter((p) => p.status === 'submitted' || p.status === 'graded').length;
  return { done, total };
}

function assignmentStatusMeta(assignment: Assignment): {
  id: 'graded' | 'submitted' | 'overdue' | 'notStarted';
  className: string;
  icon: LucideIcon;
} {
  const { done, total } = progressOf(assignment);
  const graded = assignment.problems.filter((p) => p.status === 'graded').length;

  if (total > 0 && graded === total) {
    return { id: 'graded', icon: GraduationCap, className: 'border-navy bg-navy text-white' };
  }
  if (total > 0 && done === total) {
    return { id: 'submitted', icon: CheckCircle2, className: 'border-navy/15 bg-navy-tint text-navy' };
  }
  if (assignment.overdue) {
    return { id: 'overdue', icon: Clock, className: 'border-brass/25 bg-brass-tint text-brass-strong' };
  }
  
  return { id: 'notStarted', icon: Circle, className: 'border-hairline bg-white text-muted' };
}

function matchesFilter(assignment: Assignment, status: FilterStatus) {
  if (status === 'all') return true;
  const { done, total } = progressOf(assignment);
  const graded = assignment.problems.filter((p) => p.status === 'graded').length;
  if (status === 'graded') return total > 0 && graded === total;
  if (status === 'submitted') return total > 0 && done === total && graded < total;
  if (status === 'notStarted') return done === 0;
  return done > 0 && done < total;
}

const FILTERS: FilterStatus[] = ['all', 'notStarted', 'submitted', 'graded'];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
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

  const [activeProblemModal, setActiveProblemModal] = useState<{
    assignmentId: string;
    problem: AssignmentProblem;
  } | null>(null);

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesQuery =
        q.length === 0 || assignment.title.toLowerCase().includes(q) || assignment.course.toLowerCase().includes(q);
      return matchesQuery && matchesFilter(assignment, statusFilter);
    });
  }, [assignments, query, statusFilter]);

  const openCount = assignments.filter((a) => progressOf(a).done < a.problems.length).length;
  const dueSoonCount = assignments.filter((a) => a.overdue || a.dueLabel.toLowerCase().includes('tomorrow')).length;
  const submittedCount = assignments.filter((a) => {
    const { done, total } = progressOf(a);
    return total > 0 && done === total;
  }).length;

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

  async function handleFile(assignmentId: string, problemId: string, file: File) {
    try {
      const base64 = await fileToBase64(file);
      updateProblem(assignmentId, problemId, (problem) => ({
        ...problem,
        status: 'uploaded',
        fileName: file.name,
        previewUrl: base64,
      }));
    } catch (e) {
      console.error(e);
    }
  }

  function handleRemoveFile(assignmentId: string, problemId: string) {
    updateProblem(assignmentId, problemId, (problem) => {
      return { ...problem, status: 'notStarted', fileName: undefined, previewUrl: undefined };
    });
  }

  async function handleMarkSubmitted(assignmentId: string, problemId: string) {
    const assignment = assignments.find((a) => a.id === assignmentId);
    const problem = assignment?.problems.find((p) => p.id === problemId);
    if (!problem?.previewUrl) return;

    const res = await submitStudentHomeworkAction({
      assignmentId,
      attachmentUrl: problem.previewUrl,
    });

    if (res.success) {
      updateProblem(assignmentId, problemId, (p) => ({ ...p, status: 'submitted' }));
      setNotice("დავალება წარმატებით გაიგზავნა მასწავლებელთან!");
      setTimeout(() => setNotice(null), 3500);
    }
  }

  function handleWithdraw(assignmentId: string, problemId: string) {
    updateProblem(assignmentId, problemId, (problem) => ({ ...problem, status: 'uploaded' }));
  }

  async function handleSubmitAssignment(assignment: Assignment) {
    for (const problem of assignment.problems) {
      if (problem.status === 'uploaded' && problem.previewUrl) {
        await submitStudentHomeworkAction({
          assignmentId: assignment.id,
          attachmentUrl: problem.previewUrl,
        });
      }
    }
    setAssignments((prev) =>
      prev.map((item) =>
        item.id !== assignment.id
          ? item
          : {
              ...item,
              problems: item.problems.map((p) =>
                p.status === 'uploaded' ? { ...p, status: 'submitted' } : p,
              ),
            },
      ),
    );
    setNotice("ყველა დავალება გაიგზავნა მასწავლებელთან!");
    setTimeout(() => setNotice(null), 3500);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <PageHero
        icon={ClipboardList}
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        description={copy.hero.description}
        aside={
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-1">
            <div className="rounded-xl border border-hairline bg-white px-3 py-2.5 text-center sm:text-left">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{copy.stats.open}</p>
              <p className="mt-0.5 text-xl font-semibold text-ink">{openCount}</p>
            </div>
            <div className="rounded-xl border border-hairline bg-white px-3 py-2.5 text-center sm:text-left">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{copy.stats.dueSoon}</p>
              <p className="mt-0.5 text-xl font-semibold text-ink">{dueSoonCount}</p>
            </div>
            <div className="rounded-xl border border-hairline bg-white px-3 py-2.5 text-center sm:text-left">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{copy.stats.submitted}</p>
              <p className="mt-0.5 text-xl font-semibold text-ink">{submittedCount}</p>
            </div>
          </div>
        }
      />

      <div className="mt-6 grid gap-5 xl:h-[calc(100vh-8.5rem)] xl:min-h-144 xl:grid-cols-[16.5rem_minmax(0,1fr)] xl:items-stretch">
        
        {/* მარცხენა სვეტი: ფილტრები */}
        <aside className="relative z-20 flex min-h-0 flex-col rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
          <h2 className="shrink-0 border-b border-hairline pb-3 text-sm font-semibold tracking-wide text-brass">
            {copy.filters.title}
          </h2>

          <div className="mt-4 flex min-h-0 flex-col gap-5 overflow-y-auto pe-0.5 pb-2">
            <div>
              <label className="sr-only" htmlFor={`${baseId}-search`}>
                {copy.filters.searchLabel}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  id={`${baseId}-search`}
                  type="search"
                  className={`${fieldClass} pl-9`}
                  placeholder={copy.filters.searchPlaceholder}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-hairline-soft pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.filters.statusLabel}</p>
              <div className="flex flex-col gap-1.5">
                {FILTERS.map((filterId) => (
                  <button
                    key={filterId}
                    type="button"
                    aria-pressed={statusFilter === filterId}
                    onClick={() => setStatusFilter(filterId)}
                    className={[
                      'rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
                      statusFilter === filterId
                        ? 'bg-navy-tint text-navy'
                        : 'text-body hover:bg-paper-deep/80 hover:text-navy',
                    ].join(' ')}>
                    {copy.filters.statuses[filterId]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto shrink-0 flex justify-center border-t border-hairline-soft pt-4">
            <button
              type="button"
              className="w-full rounded-[15px] border border-navy/20 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:border-navy/40 hover:bg-navy-tint"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
              }}>
              {copy.filters.reset}
            </button>
          </div>
        </aside>

        {/* მარჯვენა სვეტი: დავალებების სია */}
        <section
          className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-hairline bg-white/50 p-4 shadow-sm sm:p-5"
          aria-label="Assignments">
          
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
            <p className="text-sm font-medium text-muted" aria-live="polite">
              {visible.length === 1
                ? copy.list.countLabel_one.replace('{count}', '1')
                : copy.list.countLabel_other.replace('{count}', visible.length.toString())}
            </p>
            {notice && (
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                {notice}
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-sm font-medium text-muted">
              <Loader2 className="size-8 animate-spin text-navy" />
              <span>იტვირთება ამოცანები...</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
              <ClipboardList className="size-12 text-muted/30 mb-3" />
              <p className="text-lg font-bold text-ink">{copy.list.emptyTitle}</p>
              <p className="mt-1 text-sm text-body max-w-sm">{copy.list.emptyHint}</p>
            </div>
          ) : (
            <div className="mt-4 flex-1 overflow-y-auto pe-1 pb-4">
              <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {visible.map((assignment) => {
                  const { done, total } = progressOf(assignment);
                  const meta = assignmentStatusMeta(assignment);
                  const StatusIcon = meta.icon;
                  // ვამოწმებთ ორივე ველს (მასწავლებლის გაგზავნილი ინსტრუქცია/კომენტარი)
                  const teacherNote = assignment.instructions || assignment.note;

                  return (
                    <li key={assignment.id} className="flex flex-col rounded-2xl border border-hairline bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                      
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline-soft pb-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.className}`}>
                              <StatusIcon className="size-3" aria-hidden="true" />
                              {copy.assignmentStatus[meta.id]}
                            </span>
                            <span className="text-xs font-bold text-muted">{total > 0 ? `${done}/${total} შესრულებული` : ''}</span>
                          </div>
                          <h3 className="text-lg font-bold text-ink truncate">{assignment.title}</h3>
                          <p className="mt-1 text-xs font-medium text-muted">
                            <Link href={localePath(locale, '/student/courses')} className="text-navy hover:text-navy-strong">
                              {assignment.course}
                            </Link>
                            <span className="mx-1.5 opacity-50">•</span>
                            {assignment.dueLabel}
                          </p>
                        </div>
                      </div>

                      {/* მასწავლებლის დამატებული კომენტარი / ინსტრუქცია */}
                      {teacherNote && (
                        <div className="mt-4 rounded-xl bg-amber-50/50 px-4 py-3 border border-amber-100">
                          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 block">
                            {copy.detail?.teacherNote || "მასწავლებლის კომენტარი"}
                          </span>
                          <p className="text-sm font-medium text-amber-900/80 leading-relaxed whitespace-pre-wrap">{teacherNote}</p>
                        </div>
                      )}

                      <div className="mt-4 space-y-2 flex-1">
                        {assignment.problems.map((problem) => {
                          const isDone = problem.status === 'submitted' || problem.status === 'graded';
                          return (
                            <button
                              key={problem.id}
                              type="button"
                              onClick={() => setActiveProblemModal({ assignmentId: assignment.id, problem })}
                              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-hairline-soft bg-paper/50 p-3 text-left transition-all hover:border-navy/30 hover:bg-white hover:shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DIFFICULTY_TONE[problem.difficulty]}`}>
                                  {copy.detail.difficulties[problem.difficulty] || problem.difficulty}
                                </span>
                                <span className="text-sm font-bold text-ink truncate block group-hover:text-navy transition-colors">
                                  {problem.topic}
                                </span>
                              </div>
                              
                              <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                                isDone ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-white border border-hairline text-muted group-hover:border-navy/30 group-hover:text-navy"
                              }`}>
                                {isDone ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                                {isDone ? "ჩაბარებულია" : "გახსნა"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-5 pt-4 border-t border-hairline-soft flex justify-end">
                         <button
                            type="button"
                            disabled={!assignment.problems.some((p) => p.status === 'uploaded')}
                            onClick={() => void handleSubmitAssignment(assignment)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white hover:bg-navy-strong disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                          >
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            {copy.detail.submitAll}
                          </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* ამოცანის დეტალური მოდალი სრული კავშირით */}
      {activeProblemModal && (
        <ProblemDetailModal
          problem={activeProblemModal.problem}
          assignmentTitle={assignments.find(a => a.id === activeProblemModal.assignmentId)?.title || "დავალება"}
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
            await handleMarkSubmitted(activeProblemModal.assignmentId, activeProblemModal.problem.id);
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