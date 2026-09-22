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
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />

      <div className="flex shrink-0 items-center gap-2.5 border-b border-hairline px-4 py-4">
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-brass-tint text-brass-strong">
          <Filter className="size-4" />
        </span>
        <h3 className="text-sm font-bold text-ink">ფილტრები</h3>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {FILTERS.map((filter) => {
          const isActive = statusFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] font-bold transition ${
                isActive
                  ? 'border-navy/25 bg-navy-tint text-navy-strong shadow-sm'
                  : 'border-transparent text-body hover:bg-paper hover:text-ink'
              }`}
            >
              <span className="truncate">{filter.label}</span>
              {isActive ? (
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                  <Check className="size-3" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
