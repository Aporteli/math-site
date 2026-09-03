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
  return (
    <div className="flex w-full flex-col gap-2.5">
      {/* სტატუსის ბლოკი Lichess-ის სტილში */}
      <div
        className={`rounded-2xl border px-4 py-3 shadow-inner transition-colors ${
          todayAssignmentsCount === 0
            ? 'border-hairline bg-surface text-muted'
            : isGroupAlreadySubmitted
              ? 'border-brass/30 bg-brass-tint text-brass'
              : 'border-brass/40 bg-surface text-ink'
        }`}>
        <div className="mt-1 flex items-center gap-2">
          {todayAssignmentsCount === 0 ? (
            <>
              <BookOpen className="size-5 text-muted shrink-0" />
              <span className="text-base font-bold text-muted">დავალება არ არის</span>
            </>
          ) : isGroupAlreadySubmitted ? (
            <>
              <CheckCircle2 className="size-5 text-brass shrink-0" />
              <span className="text-base font-bold text-brass">გაგზავნილია</span>
            </>
          ) : (
            <>
              <Clock className="size-5 text-brass shrink-0" />
              <span className="text-base font-bold text-ink">შესასრულებელი</span>
            </>
          )}
        </div>
      </div>

      {courses.length > 0 && (
        <div >
          {courses.map((course) => (
            <StudentCourseVideoCallButton
              key={course.id}
              courseId={course.id}
              courseTitle={course.title}
              label="ვიდეო გაკვეთილი"
              showFullscreen
            />
          ))}
        </div>
      )}
    </div>
  );
}