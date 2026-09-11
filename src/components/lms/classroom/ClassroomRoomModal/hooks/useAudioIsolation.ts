'use client';

import { useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';

export const AUDIO_ISOLATION_TOPIC = 'audio-isolation';

export interface AudioIsolationResult {
  ok: boolean;
  isolated: boolean;
  studentIdentity: string;
  affectedParticipants: number;
  failures: string[];
}

export function useAudioIsolation(courseId: string) {
  const room = useRoomContext();

  const setStudentIsolation = useCallback(
    async (studentIdentity: string, isolate: boolean) => {
      const res = await fetch('/api/livekit/isolation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, studentIdentity, isolate }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Audio isolation request failed');
      }
      try {
        const payload = new TextEncoder().encode(JSON.stringify({ studentIdentity, isolate }));
        await room?.localParticipant.publishData(payload as any, {
          topic: AUDIO_ISOLATION_TOPIC,
          reliable: true,
        });
      } catch (error) {
        console.warn('Audio isolation broadcast skipped:', error);
      }

      return (await res.json()) as AudioIsolationResult;
    },
    [courseId, room],
  );

  return { setStudentIsolation };
}
