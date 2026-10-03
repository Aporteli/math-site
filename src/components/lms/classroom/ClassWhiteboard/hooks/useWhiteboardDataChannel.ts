//CUT

'use client';

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { RemoteParticipant, Room } from 'livekit-client';
import { ConnectionState, RoomEvent } from 'livekit-client';
import type { CanvasElement, KonvaCanvasHandle } from '../../KonvaCanvas/utils/types';
import { ChunkAssembler, type ChunkObservation } from '../utils/chunk';
import { adaptElementsForTheme } from '../utils/theme';
import type { BoardView, HistoryMap } from '../utils/types';
import {
  assignedFullSyncPayload,
  beginWhiteboardFullSync,
  fullSyncKind,
  sharedFullSyncPayload,
  type BoardAssignmentMap,
} from '@/lib/livekit/board-assignment';
import { applyPageDelta } from '../utils/whiteboard-delta';
import { noteWhiteboard, whiteboardPayloadType } from '@/lib/livekit/diagnostics/whiteboard-trace';
import {
  expectWhiteboardPaint,
  noteWhiteboardAckFailed,
  noteWhiteboardAckReceived,
  noteWhiteboardApplied,
  noteWhiteboardChunk,
  noteWhiteboardIgnored,
  noteWhiteboardParsed,
  noteWhiteboardReceiveFailure,
  shouldAckWhiteboard,
} from '@/lib/livekit/diagnostics/whiteboard-message';
import { isStaffParticipant, participantUserId } from '@/lib/livekit/participant-identity';

const TRACK_STUDENT_HISTORY = false;

/** Delay before re-requesting a full snapshot when the first request is unanswered. */
const SYNC_RETRY_DELAY_MS = 2000;

/** Minimum gap between immediate `WHITEBOARD_REQUEST_SYNC` sends. */
const SYNC_REQUEST_THROTTLE_MS = 500;

interface WhiteboardPacket {
  type?: string;
  messageId?: unknown;
  sequence?: unknown;
  pageIndex?: number;
  elements?: CanvasElement[];
  added?: CanvasElement[];
  updated?: CanvasElement[];
  deleted?: string[];
  pages?: CanvasElement[][];
  currentPageIndex?: number;
  assignedPageIndex?: number | null;
  count?: number;
  enabled?: boolean;
  view?: BoardView;
  point?: { x: number; y: number } | null;
  ackType?: unknown;
  receivedAt?: unknown;
  parsedAt?: unknown;
  appliedAt?: unknown;
  ackSentAt?: unknown;
}

function finiteTime(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value);
}

function packetElements(packet: WhiteboardPacket): number | null {
  if (packet.type === 'WHITEBOARD_DELTA') {
    return (packet.added?.length ?? 0) + (packet.updated?.length ?? 0) + (packet.deleted?.length ?? 0);
  }
  if (Array.isArray(packet.elements)) return packet.elements.length;
  if (!Array.isArray(packet.pages)) return null;
  let total = 0;
  for (const page of packet.pages) total += page?.length ?? 0;
  return total;
}

function noteChunk(observation: ChunkObservation, senderIdentity: string | null): void {
  noteWhiteboardChunk({
    messageId: observation.messageId,
    transferId: observation.transferId,
    senderIdentity,
    chunkIndex: observation.chunkIndex,
    totalChunks: observation.totalChunks,
    byteLength: observation.payloadBytes,
    at: observation.lastChunkAt,
    duplicate: observation.duplicate,
    outOfOrder: observation.outOfOrder,
    invalid: observation.invalid,
    missing: observation.missing,
    receivedCount: observation.receivedCount,
    duplicateCount: observation.duplicateCount,
    firstChunkAt: observation.firstChunkAt,
    lastChunkAt: observation.lastChunkAt,
    complete: observation.complete,
    expired: observation.expired,
    sequence: observation.sequence,
  });
}

interface Options {
  room: Room | null;
  isTeacher: boolean;
  publishDataSafe?: (payload: object, reliable?: boolean, destinationIdentities?: string[]) => Promise<void>;
  isDark: boolean;
  updateUndoRedoState: () => void;
  canvasRef: RefObject<KonvaCanvasHandle | null>;
  pagesRef: MutableRefObject<CanvasElement[][]>;
  currentPageIndexRef: MutableRefObject<number>;
  historyMapRef: MutableRefObject<HistoryMap>;
  isRemoteUpdateRef: MutableRefObject<boolean>;
  hasAppliedLiveSyncRef?: MutableRefObject<boolean>;
  chunkAssemblerRef: MutableRefObject<ChunkAssembler>;
  setPages: (pages: CanvasElement[][]) => void;
  setCurrentPageIndex: (idx: number) => void;
  setIsLocked: (locked: boolean) => void;
  applyBoardView: (view: BoardView) => void;
  assignedPageIndex: number | null;
  setAssignedPageIndex: (pageIndex: number | null) => void;
  assignedPageByStudent?: BoardAssignmentMap;
}

export function useWhiteboardDataChannel(opts: Options) {
  const {
    room,
    isTeacher,
    publishDataSafe,
    isDark,
    updateUndoRedoState,
    canvasRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    isRemoteUpdateRef,
    hasAppliedLiveSyncRef,
    chunkAssemblerRef,
    setPages,
    setCurrentPageIndex,
    setIsLocked,
    applyBoardView,
    assignedPageIndex,
    setAssignedPageIndex,
    assignedPageByStudent,
  } = opts;

  const publishRef = useRef<Options['publishDataSafe']>(publishDataSafe);
  publishRef.current = publishDataSafe;
  const fullSyncReceivedRef = useRef<Room | null>(null);
  const syncRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestTimeRef = useRef(0);
  const sendSyncRequest = useCallback(() => {
    if (!room) return;
    if (fullSyncReceivedRef.current === room) return;
    if (room.state !== ConnectionState.Connected) return;
    if (isTeacher && ![...room.remoteParticipants.values()].some((participant) => isStaffParticipant(participant))) {
      return;
    }

    const publish = publishRef.current;
    if (typeof publish !== 'function') return;

    const now = Date.now();
    if (now - lastRequestTimeRef.current >= SYNC_REQUEST_THROTTLE_MS) {
      lastRequestTimeRef.current = now;
      void publish({ type: 'WHITEBOARD_REQUEST_SYNC' }, true);
    }
    if (syncRetryTimerRef.current) clearTimeout(syncRetryTimerRef.current);
    syncRetryTimerRef.current = setTimeout(() => {
      syncRetryTimerRef.current = null;
      if (fullSyncReceivedRef.current === room) return;
      if (room.state !== ConnectionState.Connected) return;
      const retryPublish = publishRef.current;
      if (typeof retryPublish === 'function') {
        lastRequestTimeRef.current = Date.now();
        void retryPublish({ type: 'WHITEBOARD_REQUEST_SYNC' }, true);
      }
    }, SYNC_RETRY_DELAY_MS);
  }, [isTeacher, room]);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      let failureId: string | null = null;
      let failureType = 'unknown';
      let transferId: number | null = null;
      try {
        const result = chunkAssemblerRef.current.pushDetailed(payload);
        transferId = result.observation.transferId;
        if (result.observation.messageId) failureId = result.observation.messageId;
        noteChunk(result.observation, participant?.identity ?? null);
        for (const expired of chunkAssemblerRef.current.takeExpired()) noteChunk(expired, null);
        if (!result.payload) return;

        const receivedAt = Date.now();
        let parsed: unknown;
        try {
          parsed = JSON.parse(new TextDecoder().decode(result.payload));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Whiteboard message could not be read';
          noteWhiteboard({
            kind: 'receive_error',
            type: failureType,
            at: Date.now(),
            message,
            messageId: failureId ?? undefined,
          });
          noteWhiteboardReceiveFailure({
            messageId: failureId,
            transferId,
            type: failureType,
            message,
            at: Date.now(),
          });
          return;
        }
        const parsedAt = Date.now();
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Whiteboard message was not an object');
        }
        const data = parsed as WhiteboardPacket;
        const packetType = typeof data.type === 'string' ? data.type : 'unknown';
        failureType = packetType;
        const messageId =
          typeof data.messageId === 'string' && data.messageId.startsWith('wb_') ? data.messageId.slice(0, 40) : null;
        if (messageId) failureId = messageId;
        const sequence =
          typeof data.sequence === 'number' && Number.isInteger(data.sequence) && data.sequence >= 0 ? data.sequence : null;

        if (packetType === 'WHITEBOARD_ACK') {
          if (messageId && participant) {
            noteWhiteboardAckReceived({
              messageId,
              sequence: sequence ?? undefined,
              ackType: typeof data.ackType === 'string' ? data.ackType.slice(0, 40) : 'unknown',
              fromIdentity: participant.identity,
              ackReceivedAt: Date.now(),
              remoteReceivedAt: finiteTime(data.receivedAt),
              remoteParsedAt: finiteTime(data.parsedAt),
              remoteAppliedAt: finiteTime(data.appliedAt),
              remoteAckSentAt: finiteTime(data.ackSentAt),
            });
          }
          return;
        }

        noteWhiteboard({
          kind: 'received',
          type: whiteboardPayloadType(data),
          at: Date.now(),
          messageId: messageId ?? undefined,
          sequence: sequence ?? undefined,
        });

        if (messageId) {
          noteWhiteboardParsed({
            messageId,
            sequence,
            type: packetType,
            senderIdentity: participant?.identity ?? null,
            transferId,
            receivedAt,
            parsedAt,
            pageIndex: typeof data.pageIndex === 'number' && Number.isFinite(data.pageIndex) ? Math.floor(data.pageIndex) : null,
            elementCount: packetElements(data),
            payloadBytes: result.payload.byteLength,
          });
        }

        const stateStarted = Date.now();
        const finish = (pageIndex?: number, elementCount?: number | null, paint = true) => {
          if (!messageId) return;
          const appliedAt = Date.now();
          noteWhiteboardApplied({
            messageId,
            stateUpdateStartedAt: stateStarted,
            stateUpdateCompletedAt: appliedAt,
            appliedAt,
            pageIndex,
            elementCount: elementCount ?? undefined,
          });
          if (paint) expectWhiteboardPaint(messageId);
          if (!shouldAckWhiteboard(packetType)) return;
          const publish = publishRef.current;
          if (!participant || typeof publish !== 'function') {
            noteWhiteboardAckFailed({ messageId, message: 'no_sender' });
            return;
          }
          const ackSentAt = Date.now();
          void publish(
            {
              type: 'WHITEBOARD_ACK',
              messageId,
              ...(sequence !== null ? { sequence } : {}),
              ackType: packetType,
              receivedAt,
              parsedAt,
              appliedAt,
              ackSentAt,
            },
            true,
            [participant.identity],
          );
        };

        if (data.type === 'BOARD_CONTROL') {
          setIsLocked(!!data.enabled);
          finish(undefined, null, false);
          return;
        }

        if (data.type === 'BOARD_ASSIGN' && !isTeacher) {
          const next =
            typeof data.pageIndex === 'number' && Number.isFinite(data.pageIndex)
              ? Math.max(0, Math.floor(data.pageIndex))
              : null;
          setAssignedPageIndex(next);
          if (next === null) {
            fullSyncReceivedRef.current = null;
            sendSyncRequest();
          } else {
            const updated = [...pagesRef.current];
            while (updated.length <= next) updated.push([]);
            setPages(updated);
            pagesRef.current = updated;
            setCurrentPageIndex(next);
            currentPageIndexRef.current = next;
          }
          finish(next ?? undefined, null);
          return;
        }

        if (data.type === 'BOARD_VIEW' && data.view) {
          if (isTeacher) return;
          const view = data.view as BoardView;
          if (assignedPageIndex !== null) {
            applyBoardView({ ...view, pageIndex: assignedPageIndex });
          } else {
            applyBoardView(view);
          }
          return;
        }

        if (data.type === 'WHITEBOARD_REQUEST_SYNC' && isTeacher) {
          const publish = publishRef.current;
          if (typeof publish !== 'function' || !participant) {
            if (messageId) noteWhiteboardIgnored({ messageId, reason: 'sync_request', at: Date.now() });
            return;
          }
          if (isStaffParticipant(participant)) {
            const board = pagesRef.current;
            const pristine = board.length <= 1 && (board[0]?.length ?? 0) === 0;
            if (pristine) {
              if (messageId) noteWhiteboardIgnored({ messageId, reason: 'pristine_board', at: Date.now() });
              return;
            }
          }
          const requesterId = participantUserId(participant);
          const assigned = assignedPageByStudent?.[requesterId];
          const payloadToSend =
            typeof assigned === 'number'
              ? assignedFullSyncPayload(pagesRef.current, assigned)
              : sharedFullSyncPayload(pagesRef.current, currentPageIndexRef.current);
          const claim = beginWhiteboardFullSync([participant.identity], fullSyncKind(assigned));
          if (claim) void publish(payloadToSend, true, claim.identities).finally(claim.release);
          if (messageId) noteWhiteboardIgnored({ messageId, reason: 'sync_request', at: Date.now() });
          return;
        }

        if (data.type === 'WHITEBOARD_FULL_SYNC') {
          if (Array.isArray(data.pages)) {
            fullSyncReceivedRef.current = room;
            if (hasAppliedLiveSyncRef) hasAppliedLiveSyncRef.current = true;
            if (syncRetryTimerRef.current) {
              clearTimeout(syncRetryTimerRef.current);
              syncRetryTimerRef.current = null;
            }

            if (!isTeacher && typeof data.assignedPageIndex === 'number') {
              setAssignedPageIndex(data.assignedPageIndex);
            } else if (!isTeacher && data.assignedPageIndex === null) {
              setAssignedPageIndex(null);
            }

            const newPages = (data.pages as CanvasElement[][]).map((page) => adaptElementsForTheme(page || [], isDark));
            const assigned =
              !isTeacher && typeof data.assignedPageIndex === 'number'
                ? data.assignedPageIndex
                : assignedPageIndex;
            const rawIndex = assigned ?? data.currentPageIndex ?? 0;
            const newPageIndex = Math.min(Math.max(0, rawIndex), Math.max(0, newPages.length - 1));
            historyMapRef.current = new Map();
            newPages.forEach((p, idx) => {
              historyMapRef.current.set(idx, { states: [p || []], index: 0 });
            });
            setPages(newPages);
            pagesRef.current = newPages;
            setCurrentPageIndex(newPageIndex);
            currentPageIndexRef.current = newPageIndex;
            updateUndoRedoState();
            finish(newPageIndex, newPages.reduce((total, page) => total + page.length, 0));
          } else if (messageId) {
            noteWhiteboardIgnored({ messageId, reason: 'missing_pages', at: Date.now() });
          }
          return;
        }

        if (data.type === 'WHITEBOARD_PAGE_INDEX') {
          if (typeof data.pageIndex === 'number') {
            if (assignedPageIndex !== null) {
              setCurrentPageIndex(assignedPageIndex);
              currentPageIndexRef.current = assignedPageIndex;
              finish(assignedPageIndex, null);
              return;
            }
            setCurrentPageIndex(data.pageIndex);
            currentPageIndexRef.current = data.pageIndex;
            finish(data.pageIndex, null);
          } else if (messageId) {
            noteWhiteboardIgnored({ messageId, reason: 'missing_page', at: Date.now() });
          }
          return;
        }

        const commitRemotePage = (pageIndex: number, elements: CanvasElement[], adapt = true) => {
          const adaptedElements = adapt ? adaptElementsForTheme(elements, isDark) : elements;
          const updated = [...pagesRef.current];
          while (updated.length <= pageIndex) updated.push([]);
          updated[pageIndex] = adaptedElements;
          setPages(updated);
          pagesRef.current = updated;
          if (isTeacher) {
            historyMapRef.current.set(pageIndex, { states: [adaptedElements], index: 0 });
            updateUndoRedoState();
          } else if (TRACK_STUDENT_HISTORY) {
            const pHist = historyMapRef.current.get(pageIndex) || { states: [], index: -1 };
            pHist.states.push(adaptedElements);
            pHist.index = pHist.states.length - 1;
            historyMapRef.current.set(pageIndex, pHist);
            updateUndoRedoState();
          }
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 30);
          finish(pageIndex, adaptedElements.length);
        };

        if (data.type === 'WHITEBOARD_DELTA') {
          const pageIndex = typeof data.pageIndex === 'number' ? data.pageIndex : 0;
          const hasChange =
            (Array.isArray(data.added) && data.added.length > 0) ||
            (Array.isArray(data.updated) && data.updated.length > 0) ||
            (Array.isArray(data.deleted) && data.deleted.length > 0);
          if (!hasChange) {
            if (messageId) noteWhiteboardIgnored({ messageId, reason: 'empty_delta', at: Date.now() });
            return;
          }
          if (!isTeacher && assignedPageIndex !== null && pageIndex !== assignedPageIndex) {
            if (messageId) noteWhiteboardIgnored({ messageId, reason: 'assigned_page', at: Date.now() });
            return;
          }
          isRemoteUpdateRef.current = true;
          if (hasAppliedLiveSyncRef) hasAppliedLiveSyncRef.current = true;
          const current = pagesRef.current[pageIndex] ?? [];
          const themeIncoming = (elements: CanvasElement[] | undefined) =>
            Array.isArray(elements) ? adaptElementsForTheme(elements, isDark) : [];
          const merged = applyPageDelta(current, {
            added: themeIncoming(data.added),
            updated: themeIncoming(data.updated),
            deleted: data.deleted,
          });
          commitRemotePage(pageIndex, merged, false);
          return;
        }

        if (data.type === 'WHITEBOARD_SYNC' && Array.isArray(data.elements)) {
          const pageIndex = typeof data.pageIndex === 'number' ? data.pageIndex : 0;
          if (!isTeacher && assignedPageIndex !== null && pageIndex !== assignedPageIndex) {
            if (messageId) noteWhiteboardIgnored({ messageId, reason: 'assigned_page', at: Date.now() });
            return;
          }
          isRemoteUpdateRef.current = true;
          if (hasAppliedLiveSyncRef) hasAppliedLiveSyncRef.current = true;
          commitRemotePage(pageIndex, data.elements);
        } else if (data.type === 'WHITEBOARD_SYNC') {
          if (messageId) noteWhiteboardIgnored({ messageId, reason: 'missing_elements', at: Date.now() });
        } else if (data.type === 'WHITEBOARD_PAGE_COUNT') {
          if (typeof data.count === 'number') {
            const newPages = [...pagesRef.current];
            while (newPages.length < data.count) newPages.push([]);
            setPages(newPages);
            pagesRef.current = newPages;
            finish(undefined, null);
          } else if (messageId) {
            noteWhiteboardIgnored({ messageId, reason: 'missing_count', at: Date.now() });
          }
        } else if (data.type === 'WHITEBOARD_LASER') {
          if (assignedPageIndex !== null && data.pageIndex !== assignedPageIndex) return;
          if (data.pageIndex === undefined || data.pageIndex === currentPageIndexRef.current) {
            canvasRef.current?.renderRemoteLaser(data.point ?? null);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Whiteboard message could not be read';
        noteWhiteboard({
          kind: 'receive_error',
          type: failureType,
          at: Date.now(),
          message,
          messageId: failureId ?? undefined,
        });
        noteWhiteboardReceiveFailure({
          messageId: failureId,
          transferId,
          type: failureType,
          message,
          at: Date.now(),
        });
        console.error('Packet reassembly error:', err);
      }
    };

    const expireTimer = setInterval(() => {
      for (const expired of chunkAssemblerRef.current.takeExpired()) noteChunk(expired, null);
    }, 2000);

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.Connected, sendSyncRequest);
    room.on(RoomEvent.Reconnected, sendSyncRequest);

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (!isTeacher) {
        sendSyncRequest();
        return;
      }
      if (!isStaffParticipant(participant)) return;
      const board = pagesRef.current;
      const pristine = board.length <= 1 && (board[0]?.length ?? 0) === 0;
      if (pristine) sendSyncRequest();
    };
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    sendSyncRequest();

    return () => {
      clearInterval(expireTimer);
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.Connected, sendSyncRequest);
      room.off(RoomEvent.Reconnected, sendSyncRequest);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      if (syncRetryTimerRef.current) {
        clearTimeout(syncRetryTimerRef.current);
        syncRetryTimerRef.current = null;
      }
    };
  }, [
    room,
    isTeacher,
    isDark,
    updateUndoRedoState,
    canvasRef,
    pagesRef,
    currentPageIndexRef,
    historyMapRef,
    isRemoteUpdateRef,
    chunkAssemblerRef,
    setPages,
    setCurrentPageIndex,
    setIsLocked,
    applyBoardView,
    sendSyncRequest,
    assignedPageIndex,
    setAssignedPageIndex,
    assignedPageByStudent,
  ]);
}
