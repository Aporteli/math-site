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
    <div className="bg-paper border-b border-hairline px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* ტაბების კონტეინერი Lichess-ის მუქი ზედაპირით */}
      <div className="w-full sm:w-auto p-1 bg-paper-deep/80 rounded-2xl border border-hairline">
        <div className="grid grid-cols-3 sm:flex items-center gap-1">
          {/* 1. დავალებები */}
          <button
            type="button"
            onClick={() => onTabChange('tasks')}
            className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center ${
              activeTab === 'tasks'
                ? 'bg-surface text-ink shadow-inner border-hairline/80'
                : 'bg-transparent border-transparent text-body hover:text-ink'
            }`}>
            <BookOpen
              className={`size-3.5 shrink-0 transition-colors ${
                activeTab === 'tasks' ? 'text-brass' : 'text-brass/70 group-hover:text-brass'
              }`}
            />
            <span className="truncate">დავალებები</span>
            <span className="rounded-full bg-brass-tint text-brass border border-brass/25 px-1.5 py-0.5 text-[9px] font-bold shrink-0">{tasksCount}</span>
          </button>

          {/* 2. პასუხები */}
          <button
            type="button"
            onClick={() => onTabChange('answers')}
            className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center ${
              activeTab === 'answers'
                ? 'bg-surface text-ink shadow-inner border-hairline/80'
                : 'bg-transparent border-transparent text-body hover:text-ink'
            }`}>
            <CheckCircle2
              className={`size-3.5 shrink-0 transition-colors ${
                activeTab === 'answers' ? 'text-brass' : 'text-brass/70 group-hover:text-brass'
              }`}
            />
            <span className="truncate">პასუხები</span>
            {answersCount > 0 && (
              <span className="rounded-full bg-brass-tint text-brass border border-brass/25 px-1.5 py-0.5 text-[9px] font-bold shrink-0">
                {answersCount}
              </span>
            )}
          </button>

          {/* 3. მასალები */}
          <button
            type="button"
            onClick={() => onTabChange('materials')}
            className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center ${
              activeTab === 'materials'
                ? 'bg-surface text-ink shadow-inner border-hairline/80'
                : 'bg-transparent border-transparent text-body hover:text-ink'
            }`}>
            <Layers
              className={`size-3.5 shrink-0 transition-colors ${
                activeTab === 'materials' ? 'text-brass' : 'text-brass/70 group-hover:text-brass'
              }`}
            />
            <span className="truncate">მასალები</span>
            {materialsCount > 0 && (
              <span className="rounded-full bg-brass-tint text-brass border border-brass/25 px-1.5 py-0.5 text-[9px] font-bold shrink-0">
                {materialsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* მარჯვენა თარიღის ბეიჯი Lichess-ის ზედაპირით */}
      <span className="text-xs font-bold text-ink bg-surface px-3 py-1.5 rounded-xl border border-hairline shadow-inner hidden sm:inline-block">
        {formattedSelectedDate}
      </span>
    </div>
  );
}