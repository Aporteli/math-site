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
    <div className="rounded-xl bg-white/5 p-2 text-xs text-white/90 mt-1">
      <span className="font-semibold">სტუდენტები:</span>
      <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
        {participants.length === 0 ? (
          <li className="text-white/40">სტუდენტები ვერ მოიძებნა</li>
        ) : (
          participants.map((participant) => {
            const isIsolated = isolatedIdentities.includes(participant.identity);

            return (
              <li
                key={participant.identity}
                className="flex items-center justify-between pl-2 cursor-pointer hover:text-emerald-400 transition py-0.5"
                title={participant.name || participant.identity}
                onClick={(e) => handleStudentClick(e, participant)}
              >
                <span className="before:content-['•_'] before:text-white/40 truncate">
                  {participant.name ? participant.name : participant.identity}
                </span>

                {isIsolated && (
                  <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded ml-1 shrink-0">
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