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
  // ინახავს callback ფუნქციას ref-ში, რომლის ცვლილებაც არ იწვევს re-render-ს
  const onTeacherLeftRef = useRef(onTeacherLeft);

  // ყოველ render-ზე ინახავს onTeacherLeft-ის ყველაზე ახალ ვერსიას (Stale closure-ის პრევენცია)
  useEffect(() => {
    onTeacherLeftRef.current = onTeacherLeft;
  });

  useEffect(() => {
    // თუ თავად მასწავლებელია, ან ოთახი/კურსი არ არსებობს - არაფერს აკეთებს
    if (isTeacher || !courseId || !room) return;

    let cancelled = false; // Cleanup დროის ალამი async ოპერაციებისთვის
    let teacherId: string | null = null; // მასწავლებლის ID
    let sawTeacher = false; // ალამი: იყო თუ არა საერთოდ მასწავლებელი ამ ოთახში

    let kickTimer: ReturnType<typeof setTimeout> | null = null; // ტაიმერი სტუდენტის გაყვანისთვის

    // სტუდენტის ოთახიდან გაყვანის (კიქის) ფუნქცია
    const kick = () => {
      if (!cancelled) onTeacherLeftRef.current?.();
    };

    // ამოწმებს, არის თუ არა მასწავლებელი ახლა ამ ოთახში
    const teacherPresent = () =>
      Array.from(room.remoteParticipants.values()).some(
        (participant) => participantUserId(participant) === teacherId,
      );

    // აუქმებს გაყვანის ტაიმერს, თუ მასწავლებელი დაბრუნდა
    const cancelKick = () => {
      if (!kickTimer) return;
      clearTimeout(kickTimer);
      kickTimer = null;
    };

    // გეგმავს სტუდენტის გაყვანას 3 წამში (თუ მასწავლებელი არ გამოჩნდა)
    const scheduleKick = () => {
      if (kickTimer || teacherPresent()) return;
      kickTimer = setTimeout(() => {
        kickTimer = null;
        if (cancelled || teacherPresent()) return;

        // ბაზაში/სერვერზე გადამოწმება, ხომ არ არის მასწავლებელი სხვა ოთახში (მაგ: Breakout room)
        void checkTeacherInRoom(courseId).then((present) => {
          if (cancelled || present || teacherPresent()) return;
          kick();
        }).catch(() => {
          if (!cancelled && !teacherPresent()) kick();
        });
      }, 3000);
    };

    // ანახლებს სტატუსს მასწავლებლის გამოჩენისას ან გასვლისას
    const syncTeacherPresence = () => {
      if (!teacherId || room.remoteParticipants.size === 0) return;

      if (teacherPresent()) {
        sawTeacher = true; // დავაფიქსირეთ, რომ მასწავლებელი ოთახშია
        cancelKick(); // გავაუქმეთ გაყვანის ტაიმერი
        return;
      }
      if (sawTeacher) scheduleKick(); // თუ მასწავლებელი იყო და გავიდა, ვგეგმავთ კიქს
    };

    // რეაგირებს მონაწილის ოთახიდან გასვლაზე
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (!teacherId || participantUserId(participant) !== teacherId) return;

      sawTeacher = true;
      if (!teacherPresent()) scheduleKick();
    };

    // ინიციალიზაცია: იღებს მასწავლებლის ID-ს სერვერიდან
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

    // LiveKit ოთახის ივენთების მოსმენა (შემოსვლა / გასვლა)
    room.on(RoomEvent.ParticipantConnected, syncTeacherPresence);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    // Cleanup: ივენთების ჩახსნა და ტაიმერის გასუფთავება ჰუკის დახურვისას
    return () => {
      cancelled = true;
      if (kickTimer) clearTimeout(kickTimer);
      room.off(RoomEvent.ParticipantConnected, syncTeacherPresence);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [courseId, room, isTeacher]);
}