'use client';

import { Filter, Check } from 'lucide-react';
import type { FilterStatus } from '../types/student-assignment.types';
import { FILTERS } from '../helpers/student-assignment.helpers';

interface AssignmentFiltersSidebarProps {
  statusFilter: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
}

export function AssignmentFiltersSidebar({ statusFilter, onFilterChange }: AssignmentFiltersSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-box border border-hairline  shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />

      <div className="flex h-18 shrink-0 items-center gap-2.5 border-b border-hairline bg-sectionHeader px-4">
        <span className="inline-flex size-9 items-center justify-center  text-brass-strong">
          <Filter className="size-6" strokeWidth={2.5} />
        </span>
        <h3 className="text-sm font-bold text-mainText">ფილტრები</h3>
      </div>

      <div className="custom-scrollbar bg-main min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {FILTERS.map((filter) => {
          const isActive = statusFilter === filter.id;
          return (
            <button
            key={filter.id}
            type="button"
            onClick={() => onFilterChange(filter.id)}
            className={`group relative flex w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-box px-3 py-2.5 text-left text-[13px] font-bold transition-all duration-300 ${
              isActive
                ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.12)]'
                : 'text-body  hover:text-mainText'
            }`}
          >
            <span
              className={`pointer-events-none absolute -left-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-white/[0.06] blur-xl transition-all duration-500 ${
                isActive
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
              }`}
            />
          
            <span className="relative z-10 truncate">
              {filter.label}
            </span>

          </button>
          );
        })}
      </div>
    </aside>
  );
}
