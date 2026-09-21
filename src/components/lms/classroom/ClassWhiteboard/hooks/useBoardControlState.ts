//CUT

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { liveIdentitiesFor, participantUserId } from '@/lib/livekit/participant-identity';
import type { Student } from '../utils/types';

interface Options {
  room: Room | null;
  isTeacher: boolean;
  students: Student[];
  publishDataSafe: (payload: any, reliable?: boolean, destinationIdentities?: string[]) => Promise<void>;
}

export function useBoardControlState({ room, isTeacher, students, publishDataSafe }: Options) {
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [lockedStudentIds, setLockedStudentIds] = useState<Set<string>>(new Set());

  const lockedIdsRef = useRef(lockedStudentIds);
  lockedIdsRef.current = lockedStudentIds;

  useEffect(() => {
    if (!isTeacher || !room) return;

    const update = () => {
      // Presence is tracked by account id, so several devices of the same
      // student count as one present student.
      setConnectedIds(Array.from(room.remoteParticipants.values()).map(participantUserId));
    };
    update();

    room.on(RoomEvent.ParticipantConnected, update);
    room.on(RoomEvent.ParticipantDisconnected, update);
    return () => {
      room.off(RoomEvent.ParticipantConnected, update);
      room.off(RoomEvent.ParticipantDisconnected, update);
    };
  }, [isTeacher, room]);

  useEffect(() => {
    if (!isTeacher) return;
    setLockedStudentIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (!connectedIds.includes(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [isTeacher, connectedIds]);

  useEffect(() => {
    if (!isTeacher || !room) return;

    const handleConnected = () => {
      const participants = Array.from(room.remoteParticipants.values());
      for (const id of lockedIdsRef.current) {
        // Locked boards are addressed by account id; every live connection of
        // that student must receive the state.
        const destinations = liveIdentitiesFor(participants, id);
        if (destinations.length === 0) continue;
        void publishDataSafe({ type: 'BOARD_CONTROL', enabled: true }, true, destinations);
      }
    };

    room.on(RoomEvent.ParticipantConnected, handleConnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, handleConnected);
    };
  }, [isTeacher, room, publishDataSafe]);

  const presentStudents = useMemo<Student[]>(
    () => students.filter((s) => connectedIds.includes(s.identity)),
    [students, connectedIds],
  );

  const toggleStudentLock = useCallback(
    (identity: string) => {
      if (!isTeacher) return;

      const willLock = !lockedStudentIds.has(identity);
      setLockedStudentIds((prev) => {
        const next = new Set(prev);
        if (willLock) next.add(identity);
        else next.delete(identity);
        return next;
      });

      const destinations = room
        ? liveIdentitiesFor(room.remoteParticipants.values(), identity)
        : [];
      if (destinations.length > 0) {
        void publishDataSafe({ type: 'BOARD_CONTROL', enabled: willLock }, true, destinations);
      }
    },
    [isTeacher, lockedStudentIds, publishDataSafe, room],
  );

  return { presentStudents, lockedStudentIds, toggleStudentLock };
}
