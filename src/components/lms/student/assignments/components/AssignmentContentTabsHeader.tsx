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
    <div className="flex flex-col gap-2  bg-sectionHeader px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="grid w-full grid-cols-3 gap-1  bg-sectionHeader p-1 sm:flex sm:w-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-box border px-3 py-2 text-xs font-bold transition ${
                active ? 'border-navy bg-mainButton text-mainText shadow-sm' : 'text-mainText hover:bg-mainButton/40 hover:text-mainText border-none'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span
                className={` px-1.5 py-0.5 text-[12px] font-bold ${
                  active ? ' text-mainText' : ' text-mainText'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
