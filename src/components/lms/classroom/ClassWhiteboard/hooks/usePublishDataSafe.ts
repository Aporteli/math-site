'use client';

import { useCallback, useEffect, useRef } from 'react';
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

const CONTENT_TYPES = new Set(['WHITEBOARD_DELTA', 'WHITEBOARD_FULL_SYNC', 'WHITEBOARD_PAGE_COUNT']);

export type PublishPayload = object | (() => object);

export type PublishResult = { ok: true } | { ok: false; reason: 'not_connected' | 'send_error' };

export type PublishDataSafe = {
  (payload: PublishPayload, reliable?: boolean, destinationIdentities?: string[]): Promise<PublishResult>;
  whenContentIdle: () => Promise<void>;
};

type ContentJob = {
  payload: PublishPayload;
  reliable: boolean;
  destinationIdentities?: string[];
  resolve: (result: PublishResult) => void;
};

function resolvePayload(payload: PublishPayload): object {
  return typeof payload === 'function' ? payload() : payload;
}

function isContentPayload(payload: PublishPayload): boolean {
  if (typeof payload === 'function') return true;
  return CONTENT_TYPES.has(whiteboardPayloadType(payload));
}

function messageIdOf(payload: object): string | null {
  if (!('messageId' in payload)) return null;
  const messageId = (payload as { messageId?: unknown }).messageId;
  return typeof messageId === 'string' && messageId.startsWith('wb_') ? messageId.slice(0, 40) : null;
}

export function usePublishDataSafe(room: Room | null): PublishDataSafe {
  const roomRef = useRef(room);
  roomRef.current = room;
  const queueRef = useRef<ContentJob[]>([]);
  const pumpingRef = useRef(false);
  const idleWaitersRef = useRef<Array<() => void>>([]);

  const notifyIdle = () => {
    if (pumpingRef.current || queueRef.current.length > 0) return;
    const waiters = idleWaitersRef.current.splice(0, idleWaitersRef.current.length);
    for (const waiter of waiters) waiter();
  };

  const sendNow = useCallback(async (payloadSource: PublishPayload, reliable: boolean, destinationIdentities?: string[]): Promise<PublishResult> => {
    let raw: object;
    try {
      raw = resolvePayload(payloadSource);
    } catch (err) {
      console.warn('Data channel publish skipped:', err);
      return { ok: false, reason: 'send_error' };
    }

    const type = whiteboardPayloadType(raw);
    const started = Date.now();
    const currentRoom = roomRef.current;
    const participant = currentRoom?.localParticipant;
    const destinations = destinationIdentities ? destinationIdentities : null;
    const ackId = type === 'WHITEBOARD_ACK' ? messageIdOf(raw) : null;

    if (!participant || !currentRoom || currentRoom.state !== ConnectionState.Connected) {
      noteWhiteboard({
        kind: 'skipped',
        type,
        at: Date.now(),
        message: 'Whiteboard publish skipped because the room was not connected',
      });
      if (ackId) noteWhiteboardAckFailed({ messageId: ackId, message: 'not_connected' });
      return { ok: false, reason: 'not_connected' };
    }

    const stamped = stampWhiteboardPayload(raw);
    const meta = whiteboardMessageMeta(stamped);
    const traced = Boolean(meta.messageId) && shouldTraceWhiteboard(type);
    const ack = type === 'WHITEBOARD_ACK' && Boolean(meta.messageId);

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
      return { ok: true };
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
      return { ok: false, reason: 'send_error' };
    }
  }, []);

  const pumpRef = useRef<() => void>(() => {});

  pumpRef.current = () => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;
    void (async () => {
      try {
        while (queueRef.current.length > 0) {
          const job = queueRef.current.shift();
          if (!job) break;
          const result = await sendNow(job.payload, job.reliable, job.destinationIdentities);
          job.resolve(result);
        }
      } finally {
        pumpingRef.current = false;
        if (queueRef.current.length > 0) pumpRef.current();
        else notifyIdle();
      }
    })();
  };

  useEffect(() => retainWhiteboardRoom(room), [room]);

  const publish = useCallback((payload: PublishPayload, reliable = true, destinationIdentities?: string[]) => {
    if (!isContentPayload(payload)) return sendNow(payload, reliable, destinationIdentities);
    return new Promise<PublishResult>((resolve) => {
      queueRef.current.push({ payload, reliable, destinationIdentities, resolve });
      pumpRef.current();
    });
  }, [sendNow]);

  const api = publish as PublishDataSafe;
  api.whenContentIdle = () => {
    if (!pumpingRef.current && queueRef.current.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      idleWaitersRef.current.push(resolve);
    });
  };
  return api;
}
