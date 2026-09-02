'use client';

import { Filter } from 'lucide-react';
import type { FilterStatus } from '../types/student-assignment.types';
import { FILTERS } from '../helpers/student-assignment.helpers';

interface AssignmentFiltersSidebarProps {
  statusFilter: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
}

export function AssignmentFiltersSidebar({ statusFilter, onFilterChange }: AssignmentFiltersSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <Filter className="size-4 text-navy" />
        <h3 className="text-sm font-bold text-ink">ფილტრები</h3>
      </div>

      <div className="pt-3 space-y-1.5">
        <div className="grid grid-cols-1 gap-2">
          {FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`flex items-center justify-between rounded-2xl p-3 text-xs font-bold transition-all text-left ${
                  isActive
                    ? 'bg-navy text-white shadow-sm ring-1 ring-navy'
                    : 'bg-paper/50 hover:bg-paper-deep text-ink/80'
                }`}>
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
