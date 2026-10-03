'use client';

import { useCallback, useEffect } from 'react';
import type { Room } from 'livekit-client';
import { ConnectionState } from 'livekit-client';
import { noteWhiteboard, retainWhiteboardRoom, whiteboardPayloadType } from '@/lib/livekit/diagnostics/whiteboard-trace';
import {
  destinationText,
  noteWhiteboardAckFailed,
  noteWhiteboardAckSent,
  noteWhiteboardPublish,
  shouldTraceWhiteboard,
  stampWhiteboardPayload,
  whiteboardMessageMeta,
} from '@/lib/livekit/diagnostics/whiteboard-message';
import { chunkPayloadDetailed } from '../utils/chunk';

export function usePublishDataSafe(room: Room | null) {
  useEffect(() => retainWhiteboardRoom(room), [room]);

  return useCallback(
    async (payload: object, reliable = true, destinationIdentities?: string[]) => {
      const stamped = stampWhiteboardPayload(payload);
      const meta = whiteboardMessageMeta(stamped);
      const type = meta.type || whiteboardPayloadType(stamped);
      const started = Date.now();
      const participant = room?.localParticipant;
      const destinations = destinationIdentities ? destinationIdentities : null;
      const traced = Boolean(meta.messageId) && shouldTraceWhiteboard(type);
      const ack = type === 'WHITEBOARD_ACK' && Boolean(meta.messageId);

      const recordSkip = (reason: string) => {
        noteWhiteboard({
          kind: 'skipped',
          type,
          at: Date.now(),
          message: 'Whiteboard publish skipped because the room was not connected',
          messageId: meta.messageId ?? undefined,
          sequence: meta.sequence ?? undefined,
        });
        if (traced && meta.messageId) {
          noteWhiteboardPublish({
            messageId: meta.messageId,
            sequence: meta.sequence,
            type,
            destinations: destinationText(destinations),
            pageIndex: meta.pageIndex ?? undefined,
            elementCount: meta.elementCount ?? undefined,
            publishStartedAt: started,
            chunksPublished: 0,
            skippedReason: reason,
          });
        }
        if (ack && meta.messageId) noteWhiteboardAckFailed({ messageId: meta.messageId, message: reason });
      };

      if (!participant || !room || room.state !== ConnectionState.Connected) {
        recordSkip('not_connected');
        return;
      }

      let chunksPublished = 0;
      let payloadBytes: number | undefined;
      let chunkCount: number | undefined;
      let transferId: number | undefined;
      let firstChunkPublishedAt: number | undefined;
      let lastChunkPublishedAt: number | undefined;
      const chunkPublishOffsetsMs: number[] = [];
      const chunkSizes: string[] = [];

      try {
        const bytes = new TextEncoder().encode(JSON.stringify(stamped));
        payloadBytes = bytes.length;
        const chunked = chunkPayloadDetailed(bytes);
        chunkCount = chunked.chunks.length;
        if (chunked.transferId !== null) transferId = chunked.transferId;

        for (let index = 0; index < chunked.chunks.length; index += 1) {
          const chunk = chunked.chunks[index];
          if (!chunk) continue;
          await participant.publishData(new Uint8Array(chunk), { reliable, destinationIdentities });
          const now = Date.now();
          if (firstChunkPublishedAt === undefined) firstChunkPublishedAt = now;
          lastChunkPublishedAt = now;
          if (chunkPublishOffsetsMs.length < 12) chunkPublishOffsetsMs.push(now - started);
          if (chunkSizes.length < 12) chunkSizes.push(String(chunk.byteLength));
          chunksPublished += 1;
          if (chunked.chunks.length > 1 && index < chunked.chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        }

        const finished = Date.now();
        noteWhiteboard({
          kind: 'sent',
          type,
          at: finished,
          durationMs: finished - started,
          messageId: meta.messageId ?? undefined,
          sequence: meta.sequence ?? undefined,
        });
        if (traced && meta.messageId) {
          noteWhiteboardPublish({
            messageId: meta.messageId,
            sequence: meta.sequence,
            type,
            destinations: destinationText(destinations),
            payloadBytes,
            chunkCount,
            chunksPublished,
            transferId,
            pageIndex: meta.pageIndex ?? undefined,
            elementCount: meta.elementCount ?? undefined,
            publishStartedAt: started,
            firstChunkPublishedAt,
            lastChunkPublishedAt,
            publishDurationMs: finished - started,
            chunkPublishOffsetsMs,
            chunkBytes: chunkSizes.length > 0 ? chunkSizes.join(',').slice(0, 80) : undefined,
          });
        }
        if (ack && meta.messageId) noteWhiteboardAckSent({ messageId: meta.messageId, ackSentAt: finished });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Whiteboard publish failed';
        noteWhiteboard({
          kind: 'send_error',
          type,
          at: Date.now(),
          message,
          messageId: meta.messageId ?? undefined,
          sequence: meta.sequence ?? undefined,
        });
        if (traced && meta.messageId) {
          noteWhiteboardPublish({
            messageId: meta.messageId,
            sequence: meta.sequence,
            type,
            destinations: destinationText(destinations),
            payloadBytes,
            chunkCount,
            chunksPublished,
            transferId,
            pageIndex: meta.pageIndex ?? undefined,
            elementCount: meta.elementCount ?? undefined,
            publishStartedAt: started,
            firstChunkPublishedAt,
            lastChunkPublishedAt,
            publishDurationMs: Date.now() - started,
            chunkPublishOffsetsMs,
            chunkBytes: chunkSizes.length > 0 ? chunkSizes.join(',').slice(0, 80) : undefined,
            error: message,
          });
        }
        if (ack && meta.messageId) noteWhiteboardAckFailed({ messageId: meta.messageId, message });
        console.warn('Data channel publish skipped:', err);
      }
    },
    [room],
  );
}
