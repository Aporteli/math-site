'use client';

import { UploadCloud } from 'lucide-react';
import type { ContentTab, StudentItem } from '../types/teacher-workspace.types';

interface TeacherWorkspaceTabsProps {
  activeTab: ContentTab;
  setActiveTab: (tab: ContentTab) => void;
  tasksCount: number;
  answersCount: number;
  materialsCount: number;
  activeStudent?: StudentItem;
  onOpenUploadMaterial: () => void;
}

export function TeacherWorkspaceTabs({
  activeTab,
  setActiveTab,
  tasksCount,
  answersCount,
  materialsCount,
  activeStudent,
  onOpenUploadMaterial,
}: TeacherWorkspaceTabsProps) {
  return (
    <div className="bg-surface/70 border-b border-hairline px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="w-full sm:w-auto p-1 bg-paper-deep/80 rounded-2xl border border-hairline">
        <div className="grid grid-cols-3 sm:flex items-center gap-1">
          {/* 1. დავალებები */}
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-surface text-ink shadow-inner border-hairline/80'
                : 'bg-transparent border-transparent text-body hover:text-ink'
            }`}>
            <span className="truncate">დავალებები</span>
            <span className="text-brass-soft px-1.5 py-0.5 text-[12px] font-bold shrink-0">
              {tasksCount}
            </span>
          </button>

          {/* 2. პასუხები */}
          <button
            type="button"
            onClick={() => setActiveTab('answers')}
            className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center cursor-pointer ${
              activeTab === 'answers'
                ? 'bg-surface text-ink shadow-inner border-hairline/80'
                : 'bg-transparent border-transparent text-body hover:text-ink'
            }`}>
            <span className="truncate">პასუხები</span>
            {answersCount > 0 && (
              <span className="text-brass-soft px-1.5 py-0.5 text-[12px] font-bold shrink-0">
                {answersCount}
              </span>
            )}
          </button>

          {/* 3. მასალები */}
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors text-center cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-surface text-ink shadow-inner border-hairline/80'
                : 'bg-transparent border-transparent text-body hover:text-ink'
            }`}>
            <span className="truncate">მასალები</span>
            {materialsCount > 0 && (
              <span className="text-brass-soft px-1.5 py-0.5 text-[12px] font-bold shrink-0">
                {materialsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* მასალების ატვირთვის ღილაკი */}
      {activeTab === 'materials' && activeStudent && (
        <button
          type="button"
          onClick={onOpenUploadMaterial}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-navy text-white text-xs font-bold shadow-xs hover:bg-navy-strong active:scale-98 transition-all cursor-pointer">
          <UploadCloud className="size-3.5 text-white/90" />
          <span>მასალის ატვირთვა</span>
        </button>
      )}
    </div>
  );
}