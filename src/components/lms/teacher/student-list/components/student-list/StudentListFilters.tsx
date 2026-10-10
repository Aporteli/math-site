'use client';

import { Search } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { StudentGroup, StudentRecord } from '../../studentList.types';
import { GroupFilterMenu } from './GroupFilterMenu';
import { StudentListStats } from './StudentListStats';
import type { ListStats } from './types';

interface StudentListFiltersProps {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  studentCount: number;
  stats: ListStats;
  showTodayOnly: boolean;
  activeGroupId: string | 'all';
  groups: StudentGroup[];
  students: StudentRecord[];
  groupMenuOpen: boolean;
  setGroupMenuOpen: Dispatch<SetStateAction<boolean>>;
  setActiveGroupId: Dispatch<SetStateAction<string | 'all'>>;
  setShowTodayOnly: Dispatch<SetStateAction<boolean>>;
}

export function StudentListFilters({
  query,
  setQuery,
  studentCount,
  stats,
  showTodayOnly,
  activeGroupId,
  groups,
  students,
  groupMenuOpen,
  setGroupMenuOpen,
  setActiveGroupId,
  setShowTodayOnly,
}: StudentListFiltersProps) {
  return (
    <>
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="სახელი, ტელეფონი ან ელფოსტა"
          className="w-full rounded-box border border-hairline bg-searchInput py-2.5 pl-10 pr-3 text-xs font-medium text-searchInputText outline-none transition placeholder:text-searchInputText focus:border-navy focus:bg-searchInput sm:text-sm"
        />
      </div>

      <StudentListStats studentCount={studentCount} stats={stats} />

      <GroupFilterMenu
        showTodayOnly={showTodayOnly}
        activeGroupId={activeGroupId}
        groups={groups}
        students={students}
        groupMenuOpen={groupMenuOpen}
        setGroupMenuOpen={setGroupMenuOpen}
        setActiveGroupId={setActiveGroupId}
        setShowTodayOnly={setShowTodayOnly}
      />
    </>
  );
}
