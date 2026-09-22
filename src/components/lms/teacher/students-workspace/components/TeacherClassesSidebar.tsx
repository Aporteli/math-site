'use client';

import { GraduationCap, Search } from 'lucide-react';
import type { StudentItem } from '../types/teacher-workspace.types';

interface TeacherClassesSidebarProps {
  courses: { id: string; title: string }[];
  filteredCourses: { id: string; title: string }[];
  activeCourseId: string | 'all';
  classSearchQuery: string;
  setClassSearchQuery: (val: string) => void;
  handleCourseChange: (courseId: string) => void;
  studentsCount: number;
  students: StudentItem[];
}

export function TeacherClassesSidebar({
  courses,
  filteredCourses,
  activeCourseId,
  classSearchQuery,
  setClassSearchQuery,
  handleCourseChange,
  studentsCount,
  students,
}: TeacherClassesSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />

      <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-brass-tint text-brass-strong">
            <GraduationCap className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink">კლასები</h3>
            <p className="text-[11px] font-medium text-muted">{studentsCount} მოსწავლე</p>
          </div>
        </div>
        <span className="rounded-full border border-hairline bg-paper-deep px-2.5 py-1 text-[11px] font-bold text-ink">
          {courses.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={classSearchQuery}
            onChange={(e) => setClassSearchQuery(e.target.value)}
            placeholder="მოძებნეთ კლასი..."
            className="w-full rounded-xl border border-hairline bg-paper py-2.5 pl-9 pr-3 text-xs font-medium text-ink outline-none transition placeholder:text-muted focus:border-navy/50 focus:bg-surface focus:ring-2 focus:ring-navy/15"
          />
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pe-0.5">
          {filteredCourses.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs font-medium text-muted">კლასი ვერ მოიძებნა</p>
          ) : (
            filteredCourses.map((course) => {
              const active = course.id === activeCourseId;
              const courseStudents = students.filter((s) => s.courses.some((c) => c.id === course.id));

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleCourseChange(course.id)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? 'border-navy/25 bg-navy-tint text-navy-strong shadow-sm'
                      : 'border-transparent text-body hover:bg-paper hover:text-ink'
                  }`}
                >
                  <span className="truncate text-[13px] font-bold">{course.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-navy text-white' : 'bg-paper-deep text-muted'
                    }`}
                  >
                    {courseStudents.length}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
