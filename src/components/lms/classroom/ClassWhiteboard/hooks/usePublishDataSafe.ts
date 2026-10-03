'use client';

import { useCallback, useEffect } from 'react';
import type { Room } from 'livekit-client';
import { ConnectionState } from 'livekit-client';
import { noteWhiteboard, retainWhiteboardRoom, whiteboardPayloadType } from '@/lib/livekit/diagnostics/whiteboard-trace';
import { chunkPayload } from '../utils/chunk';

export function usePublishDataSafe(room: Room | null) {
  useEffect(() => retainWhiteboardRoom(room), [room]);

  return useCallback(
    async (payload: any, reliable = true, destinationIdentities?: string[]) => {
      const type = whiteboardPayloadType(payload);
      const started = Date.now();
      const participant = room?.localParticipant;
      if (!participant || !room || room.state !== ConnectionState.Connected) {
        noteWhiteboard({ kind: 'skipped', type, at: Date.now() });
        return;
      }

      try {
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        const chunks = chunkPayload(bytes);

        for (let i = 0; i < chunks.length; i++) {
          await participant.publishData(chunks[i] as any, { reliable, destinationIdentities });
          if (chunks.length > 1 && i < chunks.length - 1) {
            await new Promise((res) => setTimeout(res, 5));
          }
        }
        noteWhiteboard({ kind: 'sent', type, at: Date.now(), durationMs: Date.now() - started });
      } catch (err) {
        noteWhiteboard({
          kind: 'send_error',
          type,
          at: Date.now(),
          message: err instanceof Error ? err.message : 'Whiteboard publish failed',
        });
        console.warn('Data channel publish skipped:', err);
      }
    },
    [room],
  );
}