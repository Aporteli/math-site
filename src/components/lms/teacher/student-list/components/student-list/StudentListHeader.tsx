'use client';

import { Users } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { StudentGroup, StudentRecord } from '../../studentList.types';
import { StudentListActions } from './StudentListActions';
import { StudentListFilters } from './StudentListFilters';
import type { ListStats, StudentListView } from './types';
import { ViewSwitcher } from './ViewSwitcher';

interface StudentListHeaderProps {
  view: StudentListView;
  setView: Dispatch<SetStateAction<StudentListView>>;
  isListView: boolean;
  setEditingIndividual: Dispatch<SetStateAction<StudentRecord | null>>;
  setIndividualModalOpen: Dispatch<SetStateAction<boolean>>;
  setHomeGroupName: Dispatch<SetStateAction<string>>;
  setHomeGroupStudentIds: Dispatch<SetStateAction<string[]>>;
  setHomeGroupError: Dispatch<SetStateAction<string | null>>;
  setHomeGroupOpen: Dispatch<SetStateAction<boolean>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  students: StudentRecord[];
  stats: ListStats;
  showTodayOnly: boolean;
  activeGroupId: string | 'all';
  groups: StudentGroup[];
  groupMenuOpen: boolean;
  setGroupMenuOpen: Dispatch<SetStateAction<boolean>>;
  setActiveGroupId: Dispatch<SetStateAction<string | 'all'>>;
  setShowTodayOnly: Dispatch<SetStateAction<boolean>>;
}

export function StudentListHeader({
  view,
  setView,
  isListView,
  setEditingIndividual,
  setIndividualModalOpen,
  setHomeGroupName,
  setHomeGroupStudentIds,
  setHomeGroupError,
  setHomeGroupOpen,
  query,
  setQuery,
  students,
  stats,
  showTodayOnly,
  activeGroupId,
  groups,
  groupMenuOpen,
  setGroupMenuOpen,
  setActiveGroupId,
  setShowTodayOnly,
}: StudentListHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 overflow-visible rounded-box border border-hairline bg-main shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden sm:flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center  text-brass-strong">
              <Users className="size-7" strokeWidth={2.5} />
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <ViewSwitcher view={view} setView={setView} />
            <StudentListActions
              setEditingIndividual={setEditingIndividual}
              setIndividualModalOpen={setIndividualModalOpen}
              setHomeGroupName={setHomeGroupName}
              setHomeGroupStudentIds={setHomeGroupStudentIds}
              setHomeGroupError={setHomeGroupError}
              setHomeGroupOpen={setHomeGroupOpen}
            />
          </div>
        </div>

        {isListView ? (
          <StudentListFilters
            query={query}
            setQuery={setQuery}
            studentCount={students.length}
            stats={stats}
            showTodayOnly={showTodayOnly}
            activeGroupId={activeGroupId}
            groups={groups}
            students={students}
            groupMenuOpen={groupMenuOpen}
            setGroupMenuOpen={setGroupMenuOpen}
            setActiveGroupId={setActiveGroupId}
            setShowTodayOnly={setShowTodayOnly}
          />
        ) : null}
      </div>
    </div>
  );
}
