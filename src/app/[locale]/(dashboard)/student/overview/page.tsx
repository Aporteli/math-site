import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { PageHero } from '@/components/ui/page-hero';
import { localePath, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type HeroStat = {
  id: string;
  label: string;
  value: string;
};

type QuickLink = {
  id: string;
  title: string;
  hint: string;
  href: string;
  icon: LucideIcon;
};

type AssignmentStatus = 'overdue' | 'dueSoon' | 'upcoming' | 'done';

type Assignment = {
  id: string;
  title: string;
  course: string;
  due: string;
  status: AssignmentStatus;
};

type CourseProgressItem = {
  id: string;
  title: string;
  teacher: string;
  percent: number;
};

type GradeItem = {
  id: string;
  subject: string;
  score: number;
  date: string;
};

type ActivityEntry = {
  id: string;
  icon: LucideIcon;
  text: string;
  time: string;
};

interface PageProps {
  params: Promise<{ locale: Locale }> | { locale: Locale };
}

const DEFAULT_HERO_STATS: HeroStat[] = [
  { id: 'courses', label: 'Active courses', value: '5' },
  { id: 'due', label: 'Due this week', value: '3' },
  { id: 'avg', label: 'Average grade', value: '91' },
];

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  {
    id: 'courses',
    title: 'Courses',
    hint: 'Browse your enrolled courses and materials',
    href: '/student/courses',
    icon: BookOpen,
  },
  {
    id: 'assignments',
    title: 'Assignments',
    hint: 'Track homework and submission deadlines',
    href: '/student/assignments',
    icon: ClipboardList,
  },
  {
    id: 'practice',
    title: 'Practice',
    hint: 'Sharpen your skills with guided problem sets',
    href: '/student/practice',
    icon: Target,
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    hint: 'Review key concepts with spaced repetition',
    href: '/student/flashcards',
    icon: Layers,
  },
  {
    id: 'grades',
    title: 'Grades',
    hint: 'See scores and teacher feedback',
    href: '/student/grades',
    icon: GraduationCap,
  },
  {
    id: 'progress',
    title: 'Progress',
    hint: 'Follow your growth across every course',
    href: '/student/progress',
    icon: TrendingUp,
  },
];

const DEFAULT_COURSES: CourseProgressItem[] = [
  { id: 'algebra-2', title: 'Algebra II', teacher: 'Ms. Beridze', percent: 68 },
  { id: 'geometry', title: 'Geometry Foundations', teacher: 'Mr. Kapanadze', percent: 42 },
  { id: 'combinatorics', title: 'Combinatorics Lab', teacher: 'Ms. Lomidze', percent: 85 },
];

const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: 'a1',
    title: 'Vectors Practice Set',
    course: 'Algebra II',
    due: 'Was due yesterday',
    status: 'overdue',
  },
  {
    id: 'a2',
    title: 'Quadratic Equations Worksheet',
    course: 'Algebra II',
    due: 'Due tomorrow',
    status: 'dueSoon',
  },
  {
    id: 'a3',
    title: 'Chapter 4 Problem Set',
    course: 'Geometry Foundations',
    due: 'Due in 3 days',
    status: 'upcoming',
  },
  {
    id: 'a4',
    title: 'Probability Quiz Review',
    course: 'Combinatorics Lab',
    due: 'Due in 5 days',
    status: 'upcoming',
  },
];

const DEFAULT_GRADES: GradeItem[] = [
  { id: 'g1', subject: 'Algebra II', score: 96, date: 'Oct 2' },
  { id: 'g2', subject: 'Geometry Foundations', score: 88, date: 'Sep 28' },
  { id: 'g3', subject: 'Combinatorics Lab', score: 74, date: 'Sep 21' },
];

const DEFAULT_ACTIVITY: ActivityEntry[] = [
  { id: 'e1', icon: CheckCircle2, text: 'Submitted Chapter 3 Problem Set', time: '2h ago' },
  { id: 'e2', icon: Sparkles, text: 'Started Combinatorics Lab', time: 'Yesterday' },
  { id: 'e3', icon: Layers, text: 'Reviewed 24 flashcards', time: 'Yesterday' },
  { id: 'e4', icon: GraduationCap, text: 'Scored 96 on Algebra II quiz', time: '3 days ago' },
];

const ASSIGNMENT_STATUS: Record<AssignmentStatus, { label: string; icon: LucideIcon; className: string }> = {
  overdue: {
    label: 'Overdue',
    icon: Clock,
    className: 'border-brass/25 bg-brass-tint text-brass-strong',
  },
  dueSoon: {
    label: 'Due soon',
    icon: CalendarClock,
    className: 'border-navy/15 bg-navy-tint text-navy',
  },
  upcoming: {
    label: 'Upcoming',
    icon: Clock,
    className: 'border-hairline bg-paper-deep text-muted',
  },
  done: {
    label: 'Done',
    icon: CheckCircle2,
    className: 'border-navy bg-navy text-white',
  },
};

function gradeTone(score: number) {
  return score >= 85 ? 'bg-navy-tint text-navy' : 'bg-brass-tint text-brass-strong';
}

function SectionHeading({
  label,
  viewAllText,
  viewAllHref,
}: {
  label: string;
  viewAllText?: string;
  viewAllHref?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-brass">{label}</h2>
      {viewAllHref && viewAllText ? (
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-navy">
          {viewAllText}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export default async function StudentOverviewPage({ params }: PageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const dict = getDictionary(locale);
  const copy = dict.studentOverview;

  const studentName = 'Student';
  const streakDays = 6;
  const heroStats = DEFAULT_HERO_STATS;
  const quickLinks = DEFAULT_QUICK_LINKS;
  const courses = DEFAULT_COURSES;
  const assignments = DEFAULT_ASSIGNMENTS;
  const grades = DEFAULT_GRADES;
  const activity = DEFAULT_ACTIVITY;

  const path = (href: string) => localePath(locale, href);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl">
      <PageHero
        icon={LayoutDashboard}
        eyebrow={copy?.hero?.eyebrow || 'Student dashboard'}
        title={
          copy?.hero?.title ? copy.hero.title.replace('{studentName}', studentName) : `Welcome back, ${studentName}`
        }
        description={
          copy?.hero?.description ||
          "Here's what's on your plate today — pick up a course, clear an assignment, or keep your streak alive."
        }
        aside={
          heroStats.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-1">
              {heroStats.map((stat) => {
                let statLabel = stat.label;
                if (stat.id === 'courses') statLabel = copy?.stats?.activeCourses || stat.label;
                if (stat.id === 'due') statLabel = copy?.stats?.dueThisWeek || stat.label;
                if (stat.id === 'avg') statLabel = copy?.stats?.averageGrade || stat.label;

                return (
                  <div
                    key={stat.id}
                    className="rounded-xl border border-hairline bg-white px-3 py-2.5 text-center sm:text-left">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{statLabel}</p>
                    <p className="mt-0.5 text-xl font-semibold text-ink">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          ) : null
        }
      />

      {/* Quick links */}
      {quickLinks.length > 0 ? (
        <section className="mt-6" aria-label="Quick links">
          <p className="mb-3 text-sm font-semibold tracking-wide text-brass">
            {copy?.quickLinks?.title || 'Quick links'}
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const linkData = copy?.quickLinks?.[link.id as keyof Omit<typeof copy.quickLinks, 'title'>];
              const title = linkData?.title || link.title;
              const hint = linkData?.hint || link.hint;

              return (
                <li key={link.id} className="h-full">
                  <Link
                    href={path(link.href)}
                    className="flex h-full w-full flex-col gap-1 rounded-2xl border border-hairline bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-navy/30 hover:shadow-md">
                    <span className="flex items-start gap-2">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-tint text-navy">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 text-sm font-semibold text-ink">{title}</span>
                    </span>
                    <span className="flex-1 text-xs leading-relaxed text-muted">{hint}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left / main column */}
        <div className="space-y-6 lg:col-span-2">
          {courses.length > 0 ? (
            <section className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
              <SectionHeading
                label={copy?.sections?.continueLearning || 'Continue learning'}
                viewAllText={copy?.sections?.viewAll || 'View all'}
                viewAllHref={path('/student/courses')}
              />
              <ul className="space-y-3">
                {courses.map((course) => (
                  <li
                    key={course.id}
                    className="rounded-xl border border-hairline-soft bg-white px-4 py-3 transition-colors hover:border-hairline hover:bg-paper-deep/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{course.title}</p>
                        <p className="text-xs text-muted">{course.teacher}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-navy">{course.percent}%</span>
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-navy-tint">
                      <div
                        className="h-full rounded-full bg-navy transition-all"
                        style={{ width: `${course.percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {assignments.length > 0 ? (
            <section className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
              <SectionHeading
                label={copy?.sections?.upcomingAssignments || 'Upcoming assignments'}
                viewAllText={copy?.sections?.viewAll || 'View all'}
                viewAllHref={path('/student/assignments')}
              />
              <ul className="space-y-2">
                {assignments.map((assignment) => {
                  const status = ASSIGNMENT_STATUS[assignment.status];
                  const StatusIcon = status.icon;
                  const localizedStatusLabel = copy?.assignmentStatus?.[assignment.status] || status.label;

                  return (
                    <li key={assignment.id}>
                      <Link
                        href={path('/student/assignments')}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline-soft bg-white px-4 py-3 transition-colors hover:border-hairline hover:bg-paper-deep/60">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{assignment.title}</p>
                          <p className="text-xs text-muted">
                            {assignment.course}
                            <span aria-hidden="true"> · </span>
                            {assignment.due}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                          <StatusIcon className="size-3" aria-hidden="true" />
                          {localizedStatusLabel}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Right / sidebar column */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-brass/20 bg-brass-tint p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-brass-strong">
                <Flame className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-semibold text-brass-strong">
                  {copy?.streak?.title
                    ? copy.streak.title.replace('{streakDays}', streakDays.toString())
                    : `${streakDays} day streak`}
                </p>
                <p className="text-xs text-brass-strong/80">
                  {copy?.streak?.subtitle || 'Keep it going — study something today.'}
                </p>
              </div>
            </div>
          </section>

          {grades.length > 0 ? (
            <section className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
              <SectionHeading
                label={copy?.sections?.recentGrades || 'Recent grades'}
                viewAllText={copy?.sections?.viewAll || 'View all'}
                viewAllHref={path('/student/grades')}
              />
              <ul className="space-y-2.5">
                {grades.map((grade) => (
                  <li key={grade.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{grade.subject}</p>
                      <p className="text-xs text-muted">{grade.date}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeTone(grade.score)}`}>
                      {grade.score}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {activity.length > 0 ? (
            <section className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
              <SectionHeading label={copy?.sections?.recentActivity || 'Recent activity'} />
              <ul className="space-y-4">
                {activity.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <li key={entry.id} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-tint text-navy">
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-ink">{entry.text}</p>
                        <p className="text-xs text-muted">{entry.time}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
