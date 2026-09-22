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
    <div className="flex flex-col gap-2 border-b border-hairline bg-paper/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-hairline bg-surface p-1 sm:flex sm:w-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                active ? 'bg-navy text-white shadow-sm' : 'text-body hover:bg-paper hover:text-ink'
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-paper-deep text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'materials' && activeStudent ? (
        <button
          type="button"
          onClick={onOpenUploadMaterial}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-navy-strong"
        >
          <UploadCloud className="size-3.5" />
          <span>მასალის ატვირთვა</span>
        </button>
      ) : null}
    </div>
  );
}
