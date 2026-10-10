'use client';

import { CourseGroupHeader } from './CourseGroupHeader';
import { CourseStudentList } from './CourseStudentList';
import type { CourseGroup } from './types';

interface CourseGroupCardProps {
  group: CourseGroup;
  expandedCourseIds: string[];
  sentClassIds: string[];
  sendingClassId: string | null;
  sentStudentIds: string[];
  sendingStudentId: string | null;
  onToggleExpand: (courseId: string) => void;
  onSendToClass: (group: CourseGroup) => void;
  onSendToStudent: (student: { id: string; name: string }) => void;
}

export function CourseGroupCard({
  group,
  expandedCourseIds,
  sentClassIds,
  sendingClassId,
  sentStudentIds,
  sendingStudentId,
  onToggleExpand,
  onSendToClass,
  onSendToStudent,
}: CourseGroupCardProps) {
  const isExpanded = expandedCourseIds.includes(group.id);
  const isClassSent = sentClassIds.includes(group.id);
  const isClassSending = sendingClassId === group.id;

  return (
    <div className="overflow-hidden rounded-box border border-hairline bg-main transition hover:border-navy/30">
      <CourseGroupHeader
        group={group}
        isExpanded={isExpanded}
        isClassSent={isClassSent}
        isClassSending={isClassSending}
        onToggleExpand={() => onToggleExpand(group.id)}
        onSendToClass={() => onSendToClass(group)}
      />

      {isExpanded && (
        <CourseStudentList
          group={group}
          sentStudentIds={sentStudentIds}
          sendingStudentId={sendingStudentId}
          onSendToStudent={onSendToStudent}
        />
      )}
    </div>
  );
}
