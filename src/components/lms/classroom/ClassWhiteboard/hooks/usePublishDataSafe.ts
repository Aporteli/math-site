'use client';

import { useCallback } from 'react';
import type { Room } from 'livekit-client';
import { ConnectionState } from 'livekit-client';
import { chunkPayload } from '../utils/chunk';

export function usePublishDataSafe(room: Room | null) {
  return useCallback(
    async (payload: any, reliable = true) => {
      const participant = room?.localParticipant;
      if (!participant || !room || room.state !== ConnectionState.Connected) return;

      try {
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        const chunks = chunkPayload(bytes);

        for (let i = 0; i < chunks.length; i++) {
          await participant.publishData(chunks[i] as any, { reliable });
          if (chunks.length > 1 && i < chunks.length - 1) {
            await new Promise((res) => setTimeout(res, 5));
          }
        }
      } catch (err) {
        console.warn('Data channel publish skipped (reconnecting):', err);
      }
    },
    [room],
  );
}