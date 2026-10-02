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
      <div className="grid w-full grid-cols-3 gap-1 bg-sectionHeader p-1 sm:flex sm:w-auto">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`group relative inline-flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden  px-3 py-2 text-xs font-bold transition-all duration-200 ${
                active
                  ? ' text-mainText shadow-sm'
                  : ' text-mainText/60  hover:text-mainText'
              }`}>
              <span className="relative z-10 truncate">{tab.label}</span>

              <span className={`relative z-10 px-1.5 py-0.5 text-[12px] font-bold ${active ? 'text-mainText' : 'text-mainText/60'}`}>{count}</span>

              {/* Animated underline */}
              <span
                className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
                  active ? 'w-[calc(100%-16px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
                }`}
              />

              {/* Active glow */}
              {active && (
                <span className="absolute -bottom-1 left-1/2 h-2 w-10 -translate-x-1/2 bg-mainText/20 blur-md" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
