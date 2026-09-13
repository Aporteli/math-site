'use client';

import { useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';

export const AUDIO_ISOLATION_TOPIC = 'audio-isolation';

export interface AudioIsolationResult {
  ok: boolean;
  isolatedIdentities: string[];
  affectedParticipants: number;
  failures: string[];
}

/**
 * Client-side helper for the targeted audio isolation (Breakout/Private) mode.
 *
 * 1. Calls the authoritative server route with the *complete* isolated set, so
 *    the server recomputes the whole subscription topology.
 * 2. Broadcasts the same set so every connected client can apply it locally.
 */
export function useAudioIsolation(courseId: string) {
  const room = useRoomContext();

  const applyIsolation = useCallback(
    async (isolatedIdentities: string[]) => {
      const res = await fetch('/api/livekit/isolation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, isolatedIdentities }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Audio isolation request failed');
      }

      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ isolatedIdentities }),
        );
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

  return { applyIsolation };
}
