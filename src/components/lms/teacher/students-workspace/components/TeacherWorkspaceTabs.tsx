'use client';

import { BookOpen, CheckCircle2, Layers, UploadCloud } from 'lucide-react';
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

const tabs: { id: ContentTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'tasks', label: 'დავალებები', icon: BookOpen },
  { id: 'answers', label: 'პასუხები', icon: CheckCircle2 },
  { id: 'materials', label: 'მასალები', icon: Layers },
];

export function TeacherWorkspaceTabs({
  activeTab,
  setActiveTab,
  tasksCount,
  answersCount,
  materialsCount,
  activeStudent,
  onOpenUploadMaterial,
}: TeacherWorkspaceTabsProps) {
  const counts: Record<ContentTab, number> = {
    tasks: tasksCount,
    answers: answersCount,
    materials: materialsCount,
  };

  return (
    <div className="flex flex-col gap-2 border-b border-hairline bg-main px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
     <div className="grid w-full grid-cols-3 gap-1 rounded-box border border-hairline bg-main p-1 sm:flex sm:w-auto">
  {tabs.map((tab) => {
    const active = activeTab === tab.id;
    const count = counts[tab.id];

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={`group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-box px-4 py-2 text-xs font-bold transition-all duration-200 ${
          active
            ? 'bg-mainButton text-mainText shadow-sm'
            : 'text-mainText/50 hover:text-mainText'
        }`}
      >
        <span className="relative z-10">{tab.label}</span>

        <span
          className={`relative z-10 text-[10px] transition-opacity ${
            active ? 'opacity-70' : 'opacity-40 group-hover:opacity-70'
          }`}
        >
          {count}
        </span>

        {active && (
          <span className="absolute inset-x-2 bottom-0 h-px bg-mainText/40" />
        )}
      </button>
    );
  })}
</div>

      {activeTab === 'materials' && activeStudent ? (
        <button
          type="button"
          onClick={onOpenUploadMaterial}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-box bg-navy px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-navy-strong"
        >
          <UploadCloud className="size-3.5" />
          <span>მასალის ატვირთვა</span>
        </button>
      ) : null}
    </div>
  );
}
