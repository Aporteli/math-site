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
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />

      <div className="flex h-18 shrink-0 items-center justify-between border-b border-hairline bg-sectionHeader px-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center">
            <GraduationCap strokeWidth={2.5} color="#d57a20" className="size-8 text-icons" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-mainText">კლასები</h3>
            <p className="text-[11px] font-medium text-mainText">{studentsCount} მოსწავლე</p>
          </div>
        </div>
        <span className=" px-2.5 py-1 text-[16px] font-bold text-mainText">{courses.length}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-searchInputText" />
          <input
            type="text"
            value={classSearchQuery}
            onChange={(e) => setClassSearchQuery(e.target.value)}
            placeholder="მოძებნეთ კლასი..."
            className="w-full rounded-box border border-hairline bg-searchInput py-2.5 pl-9 pr-3 text-xs font-medium text-searchInputText outline-none transition placeholder:text-searchInputText focus:border-navy focus:bg-searchInput"
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
                  className={`group relative flex w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-box px-3 py-2.5 text-left transition-all duration-300 ${
                    active
                      ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12),0_6px_18px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.12)]'
                      : 'text-body hover:bg-mainButtonHover hover:text-mainText'
                  }`}>
                  <span
                    className={`pointer-events-none absolute -left-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-white/[0.06] blur-xl transition-all duration-500 ${
                      active
                        ? 'translate-x-0 opacity-100'
                        : '-translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                    }`}
                  />

                  <span className="relative z-10 truncate text-[13px] font-bold">{course.title}</span>

                  <span
                    className={`relative z-10 shrink-0 px-2 py-0.5 text-[13px] font-bold transition-all duration-300 ${
                      active
                        ? ' text-mainText'
                        : 'text-mainText/70  group-hover:text-mainText'
                    }`}>
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
