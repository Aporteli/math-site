//CUT

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
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
      setConnectedIds(Array.from(room.remoteParticipants.values()).map((p) => p.identity));
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
      for (const id of lockedIdsRef.current) {
        void publishDataSafe({ type: 'BOARD_CONTROL', enabled: true }, true, [id]);
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
      if (willLock) {
        setLockedStudentIds((prev) => {
          const next = new Set(prev);
          next.add(identity);
          return next;
        });
        void publishDataSafe({ type: 'BOARD_CONTROL', enabled: true }, true, [identity]);
      } else {
        setLockedStudentIds((prev) => {
          const next = new Set(prev);
          next.delete(identity);
          return next;
        });
        void publishDataSafe({ type: 'BOARD_CONTROL', enabled: false }, true, [identity]);
      }
    },
    [isTeacher, lockedStudentIds, publishDataSafe],
  );

  return { presentStudents, lockedStudentIds, toggleStudentLock };
}
