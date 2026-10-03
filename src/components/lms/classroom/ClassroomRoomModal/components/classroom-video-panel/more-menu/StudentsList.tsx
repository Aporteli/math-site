'use client';

import { useState } from 'react';
import type { RemoteParticipant } from 'livekit-client';
import { StudentModal } from './StudentModal';
import { getModalPosition } from './get-modal-position';
import type { StudentsListProps } from './types';

export function StudentsList({
  participants,
  isTeacher,
  isolatedIdentities,
  onIsolationChange,
}: StudentsListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [selectedStudent, setSelectedStudent] = useState<RemoteParticipant | null>(null);

  const handleStudentClick = (e: React.MouseEvent, participant: RemoteParticipant) => {
    e.stopPropagation();

    if (modalOpen && selectedStudent?.identity === participant.identity) {
      setModalOpen(false);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setModalPos(getModalPosition(rect));
    setSelectedStudent(participant);
    setModalOpen(true);
  };

  const handleToggleIsolation = (identity: string) => {
    const updated = isolatedIdentities.includes(identity)
      ? isolatedIdentities.filter((id) => id !== identity)
      : [...isolatedIdentities, identity];

    onIsolationChange(updated);
  };

  return (
    <>
    {isTeacher && (
    <div className="mt-1 rounded-box border border-hairline bg-sectionHeader p-2 text-xs font-bold text-mainText">
      <span>სტუდენტები:</span>
      <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
        {participants.length === 0 ? (
          <li className="font-medium text-muted">სტუდენტები ვერ მოიძებნა</li>
        ) : (
          participants.map((participant) => {
            const isIsolated = isolatedIdentities.includes(participant.identity);

            return (
              <li
                key={participant.identity}
                className="flex cursor-pointer items-center justify-between py-0.5 pl-2 text-mainText transition-colors duration-200 hover:text-navy"
                title={participant.name || participant.identity}
                onClick={(e) => handleStudentClick(e, participant)}
              >
                <span className="truncate before:text-muted before:content-['•_']">
                  {participant.name ? participant.name : participant.identity}
                </span>

                {isIsolated && (
                  <span className="ml-1 shrink-0 rounded-box border border-rose-500/30 bg-rose-500/15 px-1 text-[9px] font-bold text-rose-500">
                    იზოლირებული
                  </span>
                )}
              </li>
            );
          })
        )}
      </ul>

      <StudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        position={modalPos}
        student={selectedStudent}
        isTeacher={isTeacher}
        isIsolated={
          selectedStudent
            ? isolatedIdentities.includes(selectedStudent.identity)
            : false
        }
          onToggleIsolation={handleToggleIsolation}
        />
      </div>
    )}
    </>
  );
}