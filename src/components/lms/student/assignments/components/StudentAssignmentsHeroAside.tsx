'use client';

import { BookOpen, CheckCircle2, Clock } from 'lucide-react';
import type { StudentCourse } from '@/lib/actions/students';
import { StudentCourseVideoCallButton } from '@/components/lms/classroom/StudentCourseVideoCallButton';

interface StudentAssignmentsHeroAsideProps {
  todayAssignmentsCount: number;
  isGroupAlreadySubmitted: boolean;
  courses: StudentCourse[];
}

export function StudentAssignmentsHeroAside({
  todayAssignmentsCount,
  isGroupAlreadySubmitted,
  courses,
}: StudentAssignmentsHeroAsideProps) {
  const status =
    todayAssignmentsCount === 0
      ? { icon: BookOpen, label: 'დავალება არ არის', tone: 'text-muted' }
      : isGroupAlreadySubmitted
        ? { icon: CheckCircle2, label: 'გაგზავნილია', tone: 'text-win' }
        : { icon: Clock, label: 'შესასრულებელი', tone: 'text-brass-strong' };

  const StatusIcon = status.icon;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">დღევანდელი</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{todayAssignmentsCount}</p>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">სტატუსი</p>
          <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-bold ${status.tone}`}>
            <StatusIcon className="size-4 shrink-0" />
            <span className="truncate">{status.label}</span>
          </p>
        </div>
      </div>

      {courses.length > 0 ? (
        <div className="flex flex-col gap-2">
          {courses.map((course) => (
            <StudentCourseVideoCallButton
              key={course.id}
              courseId={course.id}
              courseTitle={course.title}
              label="ვიდეო გაკვეთილი"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
