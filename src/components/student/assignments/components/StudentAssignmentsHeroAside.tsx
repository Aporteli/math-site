'use client';

import { BookOpen, CheckCircle2, Clock } from 'lucide-react';
import type { StudentCourse } from '@/lib/actions/students';
import { StudentCourseVideoCallButton } from '@/components/lms/student/StudentCourseVideoCallButton';

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
      <div
        className={`rounded-2xl border px-4 py-3 shadow-xs transition-all ${
          todayAssignmentsCount === 0
            ? 'border-slate-200 bg-slate-50/70 text-slate-600'
            : isGroupAlreadySubmitted
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
              : 'border-amber-200 bg-amber-50/40 text-amber-900'
        }`}>
        <div className="mt-1 flex items-center gap-2">
          {todayAssignmentsCount === 0 ? (
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
              label="ვიდეო გაკვეთილი"
              showFullscreen
            />
          ))}
        </div>
      )}
    </div>
  );
}