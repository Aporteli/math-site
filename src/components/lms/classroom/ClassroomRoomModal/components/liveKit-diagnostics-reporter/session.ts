import type { Room } from 'livekit-client';
import type { BreakoutRoomKey } from '@/lib/livekit/breakout';
import type { DiagnosticEventInput, DiagnosticsReport } from '@/lib/livekit/diagnostics/contract';
import type { ConnectionMetrics, MetricCounters } from '@/lib/livekit/diagnostics/metrics';
import type { WhiteboardMessageTrace } from '@/lib/livekit/diagnostics/whiteboard-message';
import type { WhiteboardCounts } from '@/lib/livekit/diagnostics/whiteboard-trace';
import type { BoardLink, ObservedTransport, TransportSide } from './types';

export interface DiagnosticsSession {
  room: Room;
  courseId: string;
  roomKey: BreakoutRoomKey;
  secondary: boolean;
  stopped: boolean;
  leaveRequested: boolean;
  leaveAttempts: number;
  flushing: boolean;
  inFlush: boolean;
  timer: number;
  watchTimer: number;
  flushSoon: number;
  sawQuality: boolean;
  previousQuality: string | null;
  degraded: boolean;
  signalAt: number;
  loggedFailureAt: number;
  counters: MetricCounters | null;
  boardCounters: MetricCounters | null;
  boardRoomSeen: Room | null;
  latest: ConnectionMetrics | null;
  latestBoard: BoardLink | null;
  previousDtls: string | null;
  previousData: string | null;
  previousBoard: BoardLink | null;
  subscriptions: Map<string, 'subscribed' | 'muted'> | null;
  detachPublisher: () => void;
  detachSubscriber: () => void;
  boundPublisher: ObservedTransport | null;
  boundSubscriber: ObservedTransport | null;
  lastPc: { publisher: string | null; subscriber: string | null };
  lastIce: { publisher: string | null; subscriber: string | null };
  whiteboardEventAt: Map<string, number>;
  pending: DiagnosticEventInput[];
  push: (kind: DiagnosticEventInput['kind'], detail: DiagnosticEventInput['detail']) => void;
  requestFlush: () => void;
  observePc: (side: TransportSide, next: string | null) => void;
  observeIce: (side: TransportSide, next: string | null) => void;
  observeDtls: (next: string | null) => void;
  observeData: (next: string | null) => void;
  observeBoard: (link: BoardLink) => void;
  rebind: () => void;
  buildReport: (
    leaving: boolean,
    whiteboard: WhiteboardCounts,
    board: BoardLink | null,
    messages: WhiteboardMessageTrace[],
    mainThreadGapMs: number | null,
  ) => DiagnosticsReport | null;
  restore: (events: DiagnosticEventInput[]) => void;
  send: (report: DiagnosticsReport, beacon: boolean) => Promise<boolean>;
  readBoardLink: () => Promise<BoardLink | null>;
  flush: (leaving: boolean) => Promise<void>;
}

export function createDiagnosticsSession(input: {
  room: Room;
  courseId: string;
  roomKey: BreakoutRoomKey;
  secondary: boolean;
}): DiagnosticsSession {
  return {
    room: input.room,
    courseId: input.courseId,
    roomKey: input.roomKey,
    secondary: input.secondary,
    stopped: false,
    leaveRequested: false,
    leaveAttempts: 0,
    flushing: false,
    inFlush: false,
    timer: 0,
    watchTimer: 0,
    flushSoon: 0,
    sawQuality: false,
    previousQuality: null,
    degraded: false,
    signalAt: 0,
    loggedFailureAt: 0,
    counters: null,
    boardCounters: null,
    boardRoomSeen: null,
    latest: null,
    latestBoard: null,
    previousDtls: null,
    previousData: null,
    previousBoard: null,
    subscriptions: null,
    detachPublisher: () => {},
    detachSubscriber: () => {},
    boundPublisher: null,
    boundSubscriber: null,
    lastPc: { publisher: null, subscriber: null },
    lastIce: { publisher: null, subscriber: null },
    whiteboardEventAt: new Map(),
    pending: [],
    push: () => {},
    requestFlush: () => {},
    observePc: () => {},
    observeIce: () => {},
    observeDtls: () => {},
    observeData: () => {},
    observeBoard: () => {},
    rebind: () => {},
    buildReport: () => null,
    restore: () => {},
    send: async () => false,
    readBoardLink: async () => null,
    flush: async () => {},
  };
}
