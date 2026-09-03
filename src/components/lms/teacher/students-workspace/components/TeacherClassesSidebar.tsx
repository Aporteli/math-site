'use client';

import { GraduationCap, Search, Video, Plus } from 'lucide-react';
import type { StudentItem } from '../types/teacher-workspace.types';

interface TeacherClassesSidebarProps {
  courses: { id: string; title: string }[];
  filteredCourses: { id: string; title: string }[];
  activeCourseId: string | 'all';
  classSearchQuery: string;
  setClassSearchQuery: (val: string) => void;
  handleCourseChange: (courseId: string) => void;
  handleStartClassCall: () => void;
  activeStudent?: StudentItem;
  selectedCourseObj?: { id: string; title: string }; // <-- ეს ჩაამატე
  onOpenAssignModal: () => void;
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
  handleStartClassCall,
  activeStudent,
  onOpenAssignModal,
  studentsCount,
  students,
}: TeacherClassesSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl border border-hairline bg-paper shadow-sm overflow-hidden">
      {/* ჰედერი */}
      <div className="w-full flex shrink-0 items-center justify-between border-b border-hairline bg-surface/50 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-4 text-brass-strong" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink">კლასები</h3>
        </div>
        <span className="rounded-md bg-paper-deep px-2 py-0.5 text-[10px] font-mono font-bold text-muted border border-hairline/60">
          {courses.length}
        </span>
      </div>

      {/* შუა ნაწილი: ძიება და სია */}
      <div className="flex flex-1 min-h-0 flex-col p-3 gap-2.5">
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
          <input
            type="text"
            value={classSearchQuery}
            onChange={(e) => setClassSearchQuery(e.target.value)}
            placeholder="მოძებნეთ კლასი..."
            className="w-full rounded-xl border border-hairline bg-paper-deep/80 py-2 pl-9 pr-3 text-xs font-medium text-ink placeholder:text-muted outline-none focus:border-brass-strong/60 focus:bg-surface transition-all"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-hairline/60 bg-paper-deep/30 p-1.5 space-y-1 custom-scrollbar">
          {/* ყველა მოსწავლე */}
          <button
            type="button"
            onClick={() => handleCourseChange('all')}
            className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all border cursor-pointer ${
              activeCourseId === 'all'
                ? 'bg-surface border-hairline text-ink shadow-2xs font-bold'
                : 'border-transparent text-body hover:bg-surface/50 hover:text-ink'
            }`}>
            {activeCourseId === 'all' && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brass-strong" />
            )}
            <span className="truncate text-xs">ყველა მოსწავლე</span>
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                activeCourseId === 'all' ? 'bg-paper-deep text-ink' : 'text-muted'
              }`}>
              {studentsCount}
            </span>
          </button>

          {/* კურსების სია */}
          {filteredCourses.map((course) => {
            const active = course.id === activeCourseId;
            const courseStudents = students.filter((s) => s.courses.some((c) => c.id === course.id));

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => handleCourseChange(course.id)}
                className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all border cursor-pointer ${
                  active
                    ? 'bg-surface border-hairline text-ink shadow-2xs font-bold'
                    : 'border-transparent text-body hover:bg-surface/50 hover:text-ink'
                }`}>
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brass-strong" />
                )}
                <span className="truncate text-xs">{course.title}</span>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                    active ? 'bg-paper-deep text-ink' : 'text-muted'
                  }`}>
                  {courseStudents.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ქვედა ღილაკები */}
      <div className="mt-auto shrink-0 border-t border-hairline bg-paper-deep/30 p-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={handleStartClassCall}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface py-2 px-2 text-xs font-bold text-ink hover:border-navy/60 hover:bg-navy-tint/20 hover:text-navy active:scale-98 transition-all cursor-pointer min-w-0 shadow-2xs">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-navy/15 text-navy">
            <Video className="size-3" />
          </div>
          <span className="truncate">გაკვეთილი</span>
        </button>

        {activeStudent && (
          <button
            type="button"
            onClick={onOpenAssignModal}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface py-2 px-2 text-xs font-bold text-ink hover:border-brass/60 hover:bg-brass-tint/30 hover:text-brass-strong active:scale-98 transition-all cursor-pointer min-w-0 shadow-2xs">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-brass-tint text-brass-strong">
              <Plus className="size-3" />
            </div>
            <span className="truncate">ბარათი</span>
          </button>
        )}
      </div>
    </aside>
  );
}