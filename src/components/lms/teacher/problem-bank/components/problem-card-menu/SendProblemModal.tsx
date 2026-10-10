'use client';

import { createPortal } from 'react-dom';
import { AssignCommentField } from './AssignCommentField';
import { CourseGroupList } from './CourseGroupList';
import { CourseSearchField } from './CourseSearchField';
import { SendProblemModalFooter } from './SendProblemModalFooter';
import { SendProblemModalHeader } from './SendProblemModalHeader';
import type { CourseGroup } from './types';

interface SendProblemModalProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  assignComment: string;
  onAssignCommentChange: (value: string) => void;
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
  onClose: () => void;
}

export function SendProblemModal({
  searchQuery,
  onSearchQueryChange,
  assignComment,
  onAssignCommentChange,
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
  onClose,
}: SendProblemModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/60 backdrop-blur-sm fade-in duration-200"
      onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-box border border-hairline bg-white shadow-2xl transition-all "
        onClick={(e) => e.stopPropagation()}>
        <SendProblemModalHeader onClose={onClose} />
        <div className="px-4 pb-4">
          <CourseSearchField value={searchQuery} onChange={onSearchQueryChange} />

          <CourseGroupList
            groups={groups}
            isLoading={isLoading}
            expandedCourseIds={expandedCourseIds}
            sentClassIds={sentClassIds}
            sendingClassId={sendingClassId}
            sentStudentIds={sentStudentIds}
            sendingStudentId={sendingStudentId}
            onToggleExpand={onToggleExpand}
            onSendToClass={onSendToClass}
            onSendToStudent={onSendToStudent}
          />

          <AssignCommentField value={assignComment} onChange={onAssignCommentChange} />
          <SendProblemModalFooter onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
