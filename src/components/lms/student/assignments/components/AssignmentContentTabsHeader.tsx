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

const tabs: { id: StudentContentTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'tasks', label: 'დავალებები', icon: BookOpen },
  { id: 'answers', label: 'პასუხები', icon: CheckCircle2 },
  { id: 'materials', label: 'მასალები', icon: Layers },
];

export function AssignmentContentTabsHeader({
  activeTab,
  onTabChange,
  tasksCount,
  answersCount,
  materialsCount,
  formattedSelectedDate,
}: AssignmentContentTabsHeaderProps) {
  const counts: Record<StudentContentTab, number> = {
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
              onClick={() => onTabChange(tab.id)}
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

      <p className="truncate text-xs font-bold text-muted">{formattedSelectedDate}</p>
    </div>
  );
}
