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
              className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-box  px-3 py-2.5 text-left text-[13px] font-bold transition ${
                isActive
                  ? ' bg-mainButton text-mainText shadow-[0_1px_0px_rgba(0,0,0,0.2)]'
                  : 'border-transparent text-body hover:bg-mainButton hover:text-mainText'
              }`}
            >
              <span className="truncate">{filter.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
