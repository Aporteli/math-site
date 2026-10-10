'use client';

import { StudentSendRow } from './StudentSendRow';
import type { CourseGroup } from './types';

interface CourseStudentListProps {
  group: CourseGroup;
  sentStudentIds: string[];
  sendingStudentId: string | null;
  onSendToStudent: (student: { id: string; name: string }) => void;
}

export function CourseStudentList({
  group,
  sentStudentIds,
  sendingStudentId,
  onSendToStudent,
}: CourseStudentListProps) {
  return (
    <div className="space-y-1 border-t border-hairline bg-mainBackground p-2">
      {group.students.length === 0 ? (
        <p className="p-2 text-center text-[11px] text-muted">ამ კლასში მოსწავლეები არ არიან</p>
      ) : (
        group.students.map((student) => {
          const isStudentSent = sentStudentIds.includes(student.id);
          const isStudentSending = sendingStudentId === student.id;

          return (
            <StudentSendRow
              key={student.id}
              student={student}
              sent={isStudentSent}
              sending={isStudentSending}
              onSend={() => onSendToStudent(student)}
            />
          );
        })
      )}
    </div>
  );
}
