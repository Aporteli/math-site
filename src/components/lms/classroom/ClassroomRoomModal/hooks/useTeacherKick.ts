'use client';

import { useEffect, useRef } from 'react';
import { RoomEvent } from 'livekit-client';
import type { RemoteParticipant, Room } from 'livekit-client';
import { checkTeacherInRoom, getCourseTeacherId } from '@/lib/actions/room';
import { participantUserId } from '@/lib/livekit/participant-identity';

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
    /** Only a teacher that was actually in the room can end the call by leaving. */
    let sawTeacher = false;

    let kickTimer: ReturnType<typeof setTimeout> | null = null;

    const kick = () => {
      if (!cancelled) onTeacherLeftRef.current?.();
    };
    const teacherPresent = () =>
      Array.from(room.remoteParticipants.values()).some(
        (participant) => participantUserId(participant) === teacherId,
      );

    const cancelKick = () => {
      if (!kickTimer) return;
      clearTimeout(kickTimer);
      kickTimer = null;
    };

    // Leaving this room can mean the teacher joined the other breakout room.
    // Confirm they are gone from the whole class before ending the call.
    const scheduleKick = () => {
      if (kickTimer || teacherPresent()) return;
      kickTimer = setTimeout(() => {
        kickTimer = null;
        if (cancelled || teacherPresent()) return;
        void checkTeacherInRoom(courseId).then((present) => {
          if (cancelled || present || teacherPresent()) return;
          kick();
        }).catch(() => {
          if (!cancelled && !teacherPresent()) kick();
        });
      }, 3000);
    };

    const syncTeacherPresence = () => {
      if (!teacherId || room.remoteParticipants.size === 0) return;

      if (teacherPresent()) {
        sawTeacher = true;
        cancelKick();
        return;
      }
      if (sawTeacher) scheduleKick();
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (!teacherId || participantUserId(participant) !== teacherId) return;

      sawTeacher = true;
      if (!teacherPresent()) scheduleKick();
    };

    async function init() {
      try {
        teacherId = await getCourseTeacherId(courseId);
      } catch (error) {
        console.error('Failed to resolve teacher identity:', error);
        return;
      }
      if (cancelled) return;
      syncTeacherPresence();
    }

    void init();

    room.on(RoomEvent.ParticipantConnected, syncTeacherPresence);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      cancelled = true;
      if (kickTimer) clearTimeout(kickTimer);
      room.off(RoomEvent.ParticipantConnected, syncTeacherPresence);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [courseId, room, isTeacher]);
}
