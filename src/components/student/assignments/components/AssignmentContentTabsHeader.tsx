'use client';

import { BookOpen, CheckCircle2, Layers } from 'lucide-react';
import type { StudentContentTab } from '../types/student-assignment.types';

interface AssignmentContentTabsHeaderProps {
  activeTab: StudentContentTab;
  onTabChange: (tab: StudentContentTab) => void;
  tasksCount: number;
  answersCount: number;
  materialsCount: number;
  formattedSelectedDate: string;
}

export function AssignmentContentTabsHeader({
  activeTab,
  onTabChange,
  tasksCount,
  answersCount,
  materialsCount,
  formattedSelectedDate,
}: AssignmentContentTabsHeaderProps) {
  return (
    <div className="bg-paper/40 border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="w-full sm:w-auto p-1 bg-paper-deep rounded-2xl border border-hairline/80">
        <div className="grid grid-cols-3 sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTabChange('tasks')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
              activeTab === 'tasks' ? 'bg-white text-navy shadow-xs ring-1 ring-black/5' : 'text-muted hover:text-ink'
            }`}>
            <BookOpen className="size-3.5 shrink-0" />
            <span className="truncate">დავალებები</span>
            <span className="text-[10px] opacity-70 hidden sm:inline">({tasksCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('answers')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
              activeTab === 'answers' ? 'bg-white text-navy shadow-xs ring-1 ring-black/5' : 'text-muted hover:text-ink'
            }`}>
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">პასუხები</span>
            {answersCount > 0 && (
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                {answersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('materials')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
              activeTab === 'materials'
                ? 'bg-white text-navy shadow-xs ring-1 ring-black/5'
                : 'text-muted hover:text-ink'
            }`}>
            <Layers className="size-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">მასალები</span>
            {materialsCount > 0 && (
              <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                {materialsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-xl border border-hairline shadow-2xs hidden sm:inline-block">
        {formattedSelectedDate}
      </span>
    </div>
  );
}
