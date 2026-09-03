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
    <aside className="flex min-h-0 flex-col rounded-3xl border border-hairline bg-paper p-4 shadow-sm">
      {/* ზედა სათაური Lichess-ის სტილის ოქროსფერ-ნარინჯისფერი აიკონით */}
      <div className="flex items-center gap-2 border-b border-hairline pb-3">
        <Filter className="size-4 text-brass" />
        <h3 className="text-sm font-bold text-ink">ფილტრები</h3>
      </div>

      <div className="pt-3 space-y-1.5">
        <div className="grid grid-cols-1 gap-1.5">
          {FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold border transition-colors text-left ${
                  isActive
                    ? 'bg-surface text-ink border-hairline shadow-inner'
                    : 'bg-transparent border-transparent text-body hover:bg-surface/50 hover:text-ink'
                }`}
              >
                <span className="truncate">{f.label}</span>
                {isActive && (
                  <Check className="size-3.5 text-brass shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}