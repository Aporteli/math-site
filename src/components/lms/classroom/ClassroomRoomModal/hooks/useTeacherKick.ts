'use client';

import { useEffect, useRef } from 'react';
import { RoomEvent } from 'livekit-client';
import type { RemoteParticipant, Room } from 'livekit-client';
import { getCourseTeacherId } from '@/lib/actions/room';

export function useTeacherKick(
  courseId: string,
  room: Room | null,
  isTeacher: boolean,
  onTeacherLeft: (() => void) | undefined,
) {
  const onTeacherLeftRef = useRef(onTeacherLeft);

  useEffect(() => {
    onTeacherLeftRef.current = onTeacherLeft;
  });

  useEffect(() => {
    if (isTeacher || !courseId || !room) return;

    let cancelled = false;
    let teacherId: string | null = null;

    const kick = () => {
      if (!cancelled) onTeacherLeftRef.current?.();
    };
    const maybeKickIfTeacherMissing = () => {
      if (
        teacherId &&
        room.remoteParticipants.size > 0 &&
        !room.remoteParticipants.has(teacherId)
      ) {
        kick();
      }
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (teacherId && participant.identity === teacherId) {
        kick();
      }
    };

    async function init() {
      try {
        teacherId = await getCourseTeacherId(courseId);
      } catch (error) {
        console.error('Failed to resolve teacher identity:', error);
        return;
      }
      if (cancelled) return;
      maybeKickIfTeacherMissing();
    }

    void init();

    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      cancelled = true;
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [courseId, room, isTeacher]);
}
