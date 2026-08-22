'use client';

import { useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  GraduationCap,
  Paperclip,
  RotateCcw,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { PageHero } from '@/components/ui/page-hero';
import { localePath, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

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
  problems: AssignmentProblem[];
};

type FilterStatus = 'all' | 'notStarted' | 'inProgress' | 'submitted' | 'graded';

interface StudentAssignmentsProps {
  locale: Locale;
  assignments?: Assignment[];
}

const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: 'quadratics',
    title: 'Quadratic Equations Practice',
    course: 'Algebra II',
    dueLabel: 'Due tomorrow',
    note: 'Show full working for each step — a bare answer will not receive full credit.',
    problems: [
      {
        id: 'q1',
        topic: 'Quadratic Equations',
        difficulty: 'easy',
        promptTex: 'Solve for $x$: $x^2 - 5x + 6 = 0$.',
        status: 'graded',
        fileName: 'quad-1-work.jpg',
        grade: 96,
        feedback: 'Clean factoring, well laid out. Nice work.',
      },
      {
        id: 'q2',
        topic: 'Quadratic Equations',
        difficulty: 'medium',
        promptTex: 'Solve for $x$ using the quadratic formula: $2x^2 - 5x + 2 = 0$.',
        status: 'submitted',
        fileName: 'quad-2-work.jpg',
      },
      {
        id: 'q3',
        topic: 'Quadratic Equations',
        difficulty: 'medium',
        promptTex: 'Find the discriminant of $3x^2 + 4x - 2 = 0$ and describe the nature of its roots.',
        status: 'uploaded',
        fileName: 'quad-3-scan.png',
      },
      {
        id: 'q4',
        topic: 'Quadratic Equations',
        difficulty: 'hard',
        promptTex: 'A ball is thrown upward: $h(t) = -5t^2 + 20t + 1$. Find when it reaches maximum height.',
        status: 'notStarted',
      },
    ],
  },
  {
    id: 'circle-theorems',
    title: 'Circle Theorems Worksheet',
    course: 'Geometry Foundations',
    dueLabel: 'Due in 3 days',
    problems: [
      {
        id: 'c1',
        topic: 'Circle Theorems',
        difficulty: 'easy',
        promptTex: 'Prove that the angle at the centre of a circle is twice the angle at the circumference.',
        status: 'notStarted',
      },
      {
        id: 'c2',
        topic: 'Circle Theorems',
        difficulty: 'medium',
        promptTex: 'Find $\\angle ABC$ if $\\angle AOC = 118^\\circ$ and $O$ is the centre of the circle.',
        status: 'notStarted',
      },
      {
        id: 'c3',
        topic: 'Circle Theorems',
        difficulty: 'hard',
        promptTex:
          'Two chords $AB$ and $CD$ intersect at $P$ inside the circle. Show that $AP \\cdot PB = CP \\cdot PD$.',
        status: 'notStarted',
      },
    ],
  },
];

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
  id: 'graded' | 'submitted' | 'overdue' | 'inProgress' | 'notStarted';
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
  if (done > 0) {
    return { id: 'inProgress', icon: CalendarClock, className: 'border-hairline bg-paper-deep text-muted' };
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

const FILTERS: FilterStatus[] = ['all', 'notStarted', 'inProgress', 'submitted', 'graded'];

function gradeTone(score: number) {
  return score >= 85 ? 'bg-navy-tint text-navy' : 'bg-brass-tint text-brass-strong';
}

function ProblemCard({
  problem,
  inputId,
  copy,
  onFile,
  onRemoveFile,
  onMarkSubmitted,
  onWithdraw,
}: {
  problem: AssignmentProblem;
  inputId: string;
  copy: any;
  onFile: (file: File) => void;
  onRemoveFile: () => void;
  onMarkSubmitted: () => void;
  onWithdraw: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = problem.previewUrl && problem.fileName ? /\.(png|jpe?g|webp)$/i.test(problem.fileName) : false;

  return (
    <li className="rounded-2xl border border-hairline-soft bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_TONE[problem.difficulty]}`}>
          {copy.detail.difficulties[problem.difficulty]}
        </span>
        <span className="text-xs font-medium text-muted">{problem.topic}</span>
        {problem.status === 'graded' && typeof problem.grade === 'number' ? (
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeTone(problem.grade)}`}>
            {problem.grade}/100
          </span>
        ) : null}
      </div>

      <div className="mt-3 min-w-0 overflow-x-auto rounded-xl bg-paper-deep px-4 py-4">
        <KatexPreview tex={problem.promptTex} className="block min-w-0 text-ink [&_.katex]:text-[0.95rem]" />
      </div>

      <div className="mt-3">
        {problem.status === 'notStarted' ? (
          <div className="relative">
            <label htmlFor={inputId} className="sr-only">
              {copy.detail.problem.uploadAria}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.target.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) onFile(file);
              }}
              className={[
                'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
                dragActive ? 'border-navy bg-navy-tint/60' : 'border-hairline bg-paper hover:border-navy/40',
              ].join(' ')}>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-navy-tint text-navy">
                <UploadCloud className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-ink">{copy.detail.problem.dropLabel}</p>
              <p className="text-xs text-muted">{copy.detail.problem.formats}</p>
            </div>
          </div>
        ) : null}

        {problem.status === 'uploaded' ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-paper px-3 py-2.5">
            {isImage && problem.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={problem.previewUrl}
                alt=""
                className="size-10 shrink-0 rounded-lg border border-hairline object-cover"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-tint text-navy">
                <Paperclip className="size-4" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{problem.fileName}</p>
              <p className="text-xs text-muted">{copy.detail.problem.readyToSubmit}</p>
            </div>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white hover:text-navy"
              aria-label={copy.detail.problem.removeFile}
              onClick={onRemoveFile}>
              <X className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
              onClick={onMarkSubmitted}>
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {copy.detail.problem.submit}
            </button>
          </div>
        ) : null}

        {problem.status === 'submitted' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy/15 bg-navy-tint/60 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-navy" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">{copy.detail.problem.submitted}</p>
                {problem.fileName ? <p className="truncate text-xs text-navy/70">{problem.fileName}</p> : null}
              </div>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-navy hover:text-navy-strong"
              onClick={onWithdraw}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {copy.detail.problem.withdraw}
            </button>
          </div>
        ) : null}

        {problem.status === 'graded' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-paper px-3 py-2.5">
              <GraduationCap className="size-4 shrink-0 text-navy" aria-hidden="true" />
              <p className="min-w-0 truncate text-sm text-ink">{problem.fileName}</p>
            </div>
            {problem.feedback ? (
              <p className="rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm leading-relaxed text-body">
                <span className="font-semibold text-brass-strong">{copy.detail.problem.feedback} </span>
                {problem.feedback}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function StudentAssignments({
  locale,
  assignments: initialAssignments = DEFAULT_ASSIGNMENTS,
}: StudentAssignmentsProps) {
  const baseId = useId();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedId, setSelectedId] = useState<string | null>(initialAssignments[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const dict = getDictionary(locale);
  const copy = dict.studentAssignments;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesQuery =
        q.length === 0 || assignment.title.toLowerCase().includes(q) || assignment.course.toLowerCase().includes(q);
      return matchesQuery && matchesFilter(assignment, statusFilter);
    });
  }, [assignments, query, statusFilter]);

  const selected = assignments.find((assignment) => assignment.id === selectedId) ?? null;

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

  function handleFile(assignmentId: string, problemId: string, file: File) {
    const isImage = /^image\//.test(file.type);
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    updateProblem(assignmentId, problemId, (problem) => ({
      ...problem,
      status: 'uploaded',
      fileName: file.name,
      previewUrl,
    }));
  }

  function handleRemoveFile(assignmentId: string, problemId: string) {
    updateProblem(assignmentId, problemId, (problem) => {
      if (problem.previewUrl) URL.revokeObjectURL(problem.previewUrl);
      return { ...problem, status: 'notStarted', fileName: undefined, previewUrl: undefined };
    });
  }

  function handleMarkSubmitted(assignmentId: string, problemId: string) {
    updateProblem(assignmentId, problemId, (problem) => ({ ...problem, status: 'submitted' }));
  }

  function handleWithdraw(assignmentId: string, problemId: string) {
    updateProblem(assignmentId, problemId, (problem) => ({ ...problem, status: 'uploaded' }));
  }

  function handleSubmitAssignment(assignment: Assignment) {
    setAssignments((prev) =>
      prev.map((item) =>
        item.id !== assignment.id
          ? item
          : {
              ...item,
              problems: item.problems.map((problem) =>
                problem.status === 'uploaded' ? { ...problem, status: 'submitted' } : problem,
              ),
            },
      ),
    );
    setNotice(copy.notice.replace('{title}', assignment.title));
    window.setTimeout(() => setNotice(null), 3000);
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

      <div className="mt-6 grid gap-5 xl:h-[calc(100vh-8.5rem)] xl:min-h-[36rem] xl:grid-cols-[16.5rem_minmax(0,1fr)_23rem] xl:items-stretch">
        {/* სვეტი 1: Filters */}
        <aside className="relative z-20 order-1 flex min-h-0 flex-col rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
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

        {/* სვეტი 2: Assignment list */}
        <section
          className="order-3 flex min-h-0 min-w-0 flex-col rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5 xl:order-2"
          aria-label="Assignments">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
            <p className="text-sm text-muted" aria-live="polite">
              {visible.length === 1
                ? copy.list.countLabel_one.replace('{count}', '1')
                : copy.list.countLabel_other.replace('{count}', visible.length.toString())}
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="mt-10 flex flex-1 items-center justify-center text-center">
              <div>
                <p className="font-semibold text-ink">{copy.list.emptyTitle}</p>
                <p className="mt-2 text-sm text-body">{copy.list.emptyHint}</p>
              </div>
            </div>
          ) : (
            <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pe-0.5 pb-2">
              {visible.map((assignment) => {
                const active = assignment.id === selectedId;
                const { done, total } = progressOf(assignment);
                const meta = assignmentStatusMeta(assignment);
                const StatusIcon = meta.icon;

                return (
                  <li key={assignment.id}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setSelectedId(assignment.id)}
                      className={[
                        'flex w-full flex-col gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors',
                        active
                          ? 'border-navy/20 bg-navy-tint/70'
                          : 'border-hairline-soft bg-white hover:border-hairline hover:bg-paper-deep/80',
                      ].join(' ')}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                          <StatusIcon className="size-3" aria-hidden="true" />
                          {copy.assignmentStatus[meta.id]}
                        </span>
                        <span className="text-xs text-muted">{total > 0 ? `${done}/${total}` : ''}</span>
                      </span>
                      <span className="min-w-0 text-sm font-semibold text-ink">{assignment.title}</span>
                      <span className="text-xs text-muted">
                        {assignment.course}
                        <span aria-hidden="true"> · </span>
                        {assignment.dueLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* სვეტი 3: Selected assignment detail */}
        <section
          className="order-2 flex min-h-0 min-w-0 flex-col rounded-2xl border border-navy/10 bg-navy-tint/25 p-4 shadow-sm sm:p-5 xl:order-3"
          aria-label="Assignment detail">
          {selected ? (
            <>
              <div className="shrink-0 border-b border-navy/10 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-wide text-brass">{selected.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      <Link
                        href={localePath(locale, '/student/courses')}
                        className="font-medium text-navy hover:text-navy-strong">
                        {selected.course}
                      </Link>
                      <span aria-hidden="true"> · </span>
                      {selected.dueLabel}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-navy">
                    {copy.detail.submittedCount
                      .replace('{done}', progressOf(selected).done.toString())
                      .replace('{total}', selected.problems.length.toString())}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex min-h-0 flex-col gap-3 overflow-y-auto pe-1 pb-4">
                {notice ? (
                  <p className="shrink-0 rounded-xl border border-brass/20 bg-brass-tint px-3 py-2.5 text-sm font-medium text-brass-strong">
                    {notice}
                  </p>
                ) : null}

                {selected.note ? (
                  <p className="shrink-0 rounded-xl border border-navy/10 bg-white px-4 py-3 text-sm leading-relaxed text-body">
                    <span className="font-semibold text-ink">{copy.detail.teacherNote} </span>
                    {selected.note}
                  </p>
                ) : null}

                <ul className="space-y-3">
                  {selected.problems.map((problem) => (
                    <ProblemCard
                      key={problem.id}
                      problem={problem}
                      copy={copy}
                      inputId={`${baseId}-${selected.id}-${problem.id}`}
                      onFile={(file) => handleFile(selected.id, problem.id, file)}
                      onRemoveFile={() => handleRemoveFile(selected.id, problem.id)}
                      onMarkSubmitted={() => handleMarkSubmitted(selected.id, problem.id)}
                      onWithdraw={() => handleWithdraw(selected.id, problem.id)}
                    />
                  ))}
                </ul>
              </div>

              <div className="mt-auto shrink-0 border-t border-navy/10 pt-4">
                <button
                  type="button"
                  disabled={!selected.problems.some((p) => p.status === 'uploaded')}
                  onClick={() => handleSubmitAssignment(selected)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:cursor-not-allowed disabled:opacity-40">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {copy.detail.submitAll}
                </button>
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center text-sm leading-relaxed text-body">{copy.detail.empty}</p>
          )}
        </section>
      </div>
    </div>
  );
}
