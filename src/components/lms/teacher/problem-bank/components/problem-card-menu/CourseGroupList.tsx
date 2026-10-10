'use client';

import { CourseGroupCard } from './CourseGroupCard';
import { CourseGroupsEmpty } from './CourseGroupsEmpty';
import { CourseGroupsLoading } from './CourseGroupsLoading';
import type { CourseGroup } from './types';

interface CourseGroupListProps {
  groups: CourseGroup[];
  isLoading: boolean;
  expandedCourseIds: string[];
  sentClassIds: string[];
  sendingClassId: string | null;
  sentStudentIds: string[];
  sendingStudentId: string | null;
  onToggleExpand: (courseId: string) => void;
  onSendToClass: (group: CourseGroup) => void;
  onSendToStudent: (student: { id: string; name: string }) => void;
}

export function CourseGroupList({
  groups,
  isLoading,
  expandedCourseIds,
  sentClassIds,
  sendingClassId,
  sentStudentIds,
  sendingStudentId,
  onToggleExpand,
  onSendToClass,
  onSendToStudent,
}: CourseGroupListProps) {
  return (
    <div className="flex-1 space-y-2 overflow-y-auto thin-scrollbar bg-mainBackground px-4 py-2 max-h-[320px]">
      {isLoading ? (
        <CourseGroupsLoading />
      ) : groups.length === 0 ? (
        <CourseGroupsEmpty />
      ) : (
        groups.map((group) => (
          <CourseGroupCard
            key={group.id}
            group={group}
            expandedCourseIds={expandedCourseIds}
            sentClassIds={sentClassIds}
            sendingClassId={sendingClassId}
            sentStudentIds={sentStudentIds}
            sendingStudentId={sendingStudentId}
            onToggleExpand={onToggleExpand}
            onSendToClass={onSendToClass}
            onSendToStudent={onSendToStudent}
          />
        ))
      )}
    </div>
  );
}
