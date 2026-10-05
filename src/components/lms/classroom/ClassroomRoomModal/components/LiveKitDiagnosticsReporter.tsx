'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import {
  DisconnectReason,
  RoomEvent,
  Track,
  type Participant,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type Room,
  type TrackPublication,
} from 'livekit-client';
import { useBreakout } from '@/components/lms/classroom/ClassroomRoomModal/breakout/BreakoutContext';
import type { DiagnosticEventInput, DiagnosticsReport } from '@/lib/livekit/diagnostics/contract';
import {
  parseConnectionMetrics,
  type ConnectionMetrics,
  type MetricCounters,
  type StatsReportLike,
} from '@/lib/livekit/diagnostics/metrics';
import { degradationTransition, sanitizeNetworkType, sanitizeRoute } from '@/lib/livekit/diagnostics/model';
import { isAuxiliaryParticipant } from '@/lib/livekit/participant-identity';
import {
  subscribeWhiteboard,
  takeWhiteboardCounts,
  restoreWhiteboardCounts,
  whiteboardRooms,
  type WhiteboardCounts,
  type WhiteboardNote,
} from '@/lib/livekit/diagnostics/whiteboard-trace';
import {
  noteMainThreadGap,
  restoreMainThreadGap,
  restoreWhiteboardMessages,
  sanitizeWhiteboardMessages,
  takeMainThreadGap,
  takeWhiteboardMessages,
  type WhiteboardMessageTrace,
} from '@/lib/livekit/diagnostics/whiteboard-message';

const VOLUNTARY = new Set<DisconnectReason>([
  DisconnectReason.CLIENT_INITIATED,
  DisconnectReason.ROOM_DELETED,
  DisconnectReason.ROOM_CLOSED,
]);

interface ObservedTransport {
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  getConnectionState: () => RTCPeerConnectionState;
  getICEConnectionState: () => RTCIceConnectionState;
}

interface BoardLink {
  state: string | null;
  ice: string | null;
  pc: string | null;
  dataChannelState: string | null;
  dataMessagesSent: number | null;
  dataMessagesReceived: number | null;
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
}

function clip(value: string | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function metric(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return Math.min(value, 120_000);
}

function count(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value), 50_000_000);
}

function reasonName(reason: DisconnectReason | undefined): string | null {
  if (reason === undefined) return null;
  const name = DisconnectReason[reason];
  return typeof name === 'string' ? name : null;
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim().slice(0, 240);
  return 'LiveKit error';
}

function browserVisibility(): 'visible' | 'hidden' {
  return document.visibilityState === 'visible' ? 'visible' : 'hidden';
}

function effectiveType(): string | null {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  const value = connection?.effectiveType?.trim().toLowerCase() ?? '';
  if (!/^[a-z0-9-]{1,20}$/.test(value)) return null;
  return value;
}

function browserConnection(): NetworkInformation | null {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection || typeof connection.addEventListener !== 'function') return null;
  return connection;
}

function asStatsReport(report: RTCStatsReport): StatsReportLike {
  return {
    forEach(callback) {
      report.forEach((stat) => {
        const entry: { id: string; type: string; [key: string]: unknown } = {
          id: stat.id,
          type: stat.type,
        };
        for (const [key, value] of Object.entries(stat)) entry[key] = value;
        callback(entry);
      });
    },
  };
}

async function readStats(room: Room): Promise<StatsReportLike[]> {
  const manager = room.engine.pcManager;
  if (!manager) return [];
  const reports: StatsReportLike[] = [];
  try {
    const publisher = manager.publisher.getStats();
    const subscriber = manager.subscriber?.getStats();
    if (publisher) reports.push(asStatsReport(await publisher));
    if (subscriber) reports.push(asStatsReport(await subscriber));
  } catch {
    return reports;
  }
  return reports;
}

function transportOf(room: Room, side: 'publisher' | 'subscriber'): ObservedTransport | null {
  const manager = room.engine.pcManager;
  if (!manager) return null;
  const transport = side === 'publisher' ? manager.publisher : manager.subscriber;
  if (!transport) return null;
  return transport;
}

function readTransportState(transport: ObservedTransport | null, read: (value: ObservedTransport) => string): string | null {
  if (!transport) return null;
  try {
    const value = read(transport);
    return value || null;
  } catch {
    return null;
  }
}

function localMicrophone(room: Room): { publishing: boolean; state: 'published' | 'muted' | 'unpublished' } {
  for (const publication of room.localParticipant.audioTrackPublications.values()) {
    if (publication.source !== Track.Source.Microphone) continue;
    return { publishing: true, state: publication.isMuted ? 'muted' : 'published' };
  }
  return { publishing: false, state: 'unpublished' };
}

function subscribedMicrophones(room: Room): Map<string, 'subscribed' | 'muted'> {
  const states = new Map<string, 'subscribed' | 'muted'>();
  for (const participant of room.remoteParticipants.values()) {
    if (isAuxiliaryParticipant(participant)) continue;
    for (const publication of participant.audioTrackPublications.values()) {
      if (publication.source !== Track.Source.Microphone || !publication.isSubscribed) continue;
      states.set(participant.identity, publication.isMuted ? 'muted' : 'subscribed');
    }
  }
  return states;
}

export function LiveKitDiagnosticsReporter({
  courseId,
  secondary = false,
}: {
  courseId: string;
  secondary?: boolean;
}) {
  const room = useRoomContext();
  const { roomKey } = useBreakout();

  useEffect(() => {
    let stopped = false;
    let leaveRequested = false;
    let leaveAttempts = 0;
    let flushing = false;
    let inFlush = false;
    let timer = 0;
    let watchTimer = 0;
    let flushSoon = 0;
    let sawQuality = false;
    let previousQuality: string | null = null;
    let degraded = false;
    let signalAt = 0;
    let loggedFailureAt = 0;
    let counters: MetricCounters | null = null;
    let boardCounters: MetricCounters | null = null;
    let boardRoomSeen: Room | null = null;
    let latest: ConnectionMetrics | null = null;
    let latestBoard: BoardLink | null = null;
    let previousDtls: string | null = null;
    let previousData: string | null = null;
    let previousBoard: BoardLink | null = null;
    let subscriptions: Map<string, 'subscribed' | 'muted'> | null = null;
    let detachPublisher = () => {};
    let detachSubscriber = () => {};
    let boundPublisher: ObservedTransport | null = null;
    let boundSubscriber: ObservedTransport | null = null;
    const lastPc = { publisher: null as string | null, subscriber: null as string | null };
    const lastIce = { publisher: null as string | null, subscriber: null as string | null };
    const whiteboardEventAt = new Map<string, number>();
    const pending: DiagnosticEventInput[] = [];

    const push = (kind: DiagnosticEventInput['kind'], detail: DiagnosticEventInput['detail']) => {
      pending.push({
        kind,
        occurredAt: new Date().toISOString(),
        dedupeKey: crypto.randomUUID(),
        detail: {
          rttMs: latest?.rttMs ?? null,
          packetLossPct: latest?.sendLossPct ?? null,
          receiveLossPct: latest?.receiveLossPct ?? null,
          jitterMs: latest?.jitterMs ?? null,
          bitrateKbps: latest?.sendBitrateKbps ?? latest?.receiveBitrateKbps ?? null,
          quality: room.localParticipant.connectionQuality,
          ice: lastIce.publisher,
          subscriberIce: lastIce.subscriber,
          pc: lastPc.publisher,
          subscriberPc: lastPc.subscriber,
          online: navigator.onLine,
          visibility: browserVisibility(),
          ...detail,
        },
      });
      if (pending.length > 25) pending.splice(0, pending.length - 25);
    };

    const requestFlush = () => {
      if (inFlush || leaveRequested || stopped) return;
      window.clearTimeout(flushSoon);
      flushSoon = window.setTimeout(() => void flush(false), 1000);
    };

    const badTransport = (state: string) =>
      state === 'failed' || state === 'disconnected' || state === 'closed' || state === 'closing';

    const observePc = (side: 'publisher' | 'subscriber', next: string | null) => {
      if (!next || next === lastPc[side]) return;
      const previous = lastPc[side];
      lastPc[side] = next;
      if (previous === null && !badTransport(next)) return;
      push('pc_state_changed', {
        side,
        pc: next,
        previousPc: previous,
        message: `${side === 'publisher' ? 'Publisher' : 'Subscriber'} WebRTC state changed`,
      });
      requestFlush();
    };

    const observeIce = (side: 'publisher' | 'subscriber', next: string | null) => {
      if (!next || next === lastIce[side]) return;
      const previous = lastIce[side];
      lastIce[side] = next;
      if (previous === null && !badTransport(next)) return;
      push('ice_state_changed', {
        side,
        ice: side === 'publisher' ? next : lastIce.publisher,
        previousIce: side === 'publisher' ? previous : undefined,
        subscriberIce: side === 'subscriber' ? next : undefined,
        previousSubscriberIce: side === 'subscriber' ? previous : undefined,
        message: `${side === 'publisher' ? 'Publisher' : 'Subscriber'} ICE state changed`,
      });
      requestFlush();
    };

    const observeDtls = (next: string | null) => {
      if (!next || next === previousDtls) return;
      const previous = previousDtls;
      previousDtls = next;
      if (previous === null && !badTransport(next)) return;
      push('dtls_state_changed', { dtls: next, previousDtls: previous, message: 'DTLS state changed' });
    };

    const observeData = (next: string | null) => {
      if (!next || next === previousData) return;
      const previous = previousData;
      previousData = next;
      if (previous === null && !badTransport(next)) return;
      push('data_channel_changed', {
        dataChannelState: next,
        previousDataChannelState: previous,
        message: 'Data channel state changed',
      });
    };

    const observeBoard = (link: BoardLink) => {
      const previous = previousBoard;
      previousBoard = link;
      const unhealthy =
        badTransport(link.ice ?? '') ||
        badTransport(link.pc ?? '') ||
        badTransport(link.dataChannelState ?? '') ||
        link.state === 'disconnected' ||
        link.state === 'reconnecting';
      const changed = previous
        ? previous.state !== link.state ||
          previous.ice !== link.ice ||
          previous.pc !== link.pc ||
          previous.dataChannelState !== link.dataChannelState
        : unhealthy;
      if (!changed) return;
      push('board_link_changed', {
        message: 'Whiteboard connection changed while media was on another room',
        side: 'board',
        boardState: link.state,
        previousBoardState: previous?.state ?? null,
        boardIce: link.ice,
        previousBoardIce: previous?.ice ?? null,
        boardPc: link.pc,
        previousBoardPc: previous?.pc ?? null,
        dataChannelState: link.dataChannelState,
        previousDataChannelState: previous?.dataChannelState ?? null,
      });
    };

    const attach = (transport: ObservedTransport, side: 'publisher' | 'subscriber') => {
      const priorConnection = transport.onConnectionStateChange;
      const priorIce = transport.onIceConnectionStateChange;
      const onConnection = (state: RTCPeerConnectionState) => {
        priorConnection?.call(transport, state);
        observePc(side, state);
      };
      const onIce = (state: RTCIceConnectionState) => {
        priorIce?.call(transport, state);
        observeIce(side, state);
      };
      transport.onConnectionStateChange = onConnection;
      transport.onIceConnectionStateChange = onIce;
      return () => {
        if (transport.onConnectionStateChange === onConnection) transport.onConnectionStateChange = priorConnection;
        if (transport.onIceConnectionStateChange === onIce) transport.onIceConnectionStateChange = priorIce;
      };
    };

    const rebind = () => {
      const publisher = transportOf(room, 'publisher');
      const subscriber = transportOf(room, 'subscriber');
      if (publisher !== boundPublisher) {
        detachPublisher();
        boundPublisher = publisher;
        detachPublisher = publisher ? attach(publisher, 'publisher') : () => {};
      }
      if (subscriber !== boundSubscriber) {
        detachSubscriber();
        boundSubscriber = subscriber;
        detachSubscriber = subscriber ? attach(subscriber, 'subscriber') : () => {};
      }
      observePc('publisher', readTransportState(publisher, (value) => value.getConnectionState()));
      observePc('subscriber', readTransportState(subscriber, (value) => value.getConnectionState()));
      observeIce('publisher', readTransportState(publisher, (value) => value.getICEConnectionState()));
      observeIce('subscriber', readTransportState(subscriber, (value) => value.getICEConnectionState()));
    };

    const onWhiteboard = (note: WhiteboardNote) => {
      if (note.kind !== 'send_error' && note.kind !== 'receive_error' && note.kind !== 'skipped') return;
      const nowMs = Date.now();
      if (nowMs - (whiteboardEventAt.get(note.kind) ?? 0) < 15_000) return;
      whiteboardEventAt.set(note.kind, nowMs);
      const correlation = {
        ...(note.messageId ? { messageId: note.messageId } : {}),
        ...(typeof note.sequence === 'number' ? { sequence: note.sequence } : {}),
      };
      if (note.kind === 'send_error') {
        push('whiteboard_send_failed', {
          message: note.message ?? 'Whiteboard publish failed',
          whiteboardType: note.type,
          ...correlation,
        });
      } else if (note.kind === 'receive_error') {
        push('whiteboard_receive_failed', {
          message: note.message ?? 'Whiteboard message could not be read',
          whiteboardType: note.type,
          ...correlation,
        });
      } else {
        push('whiteboard_send_skipped', {
          message: note.message ?? 'Whiteboard publish skipped because the room was not connected',
          whiteboardType: note.type,
          ...correlation,
        });
      }
      requestFlush();
    };

    const onReconnecting = () => {
      push('reconnecting', { message: 'Connection entered reconnecting state' });
      requestFlush();
    };
    const onReconnected = () => {
      push('reconnected', { message: 'Connection reconnected' });
      requestFlush();
    };
    const onSignal = () => {
      const nowMs = Date.now();
      if (nowMs - signalAt < 20_000) return;
      signalAt = nowMs;
      push('signal_reconnecting', { message: 'Signal connection is reconnecting' });
      requestFlush();
    };
    const onDisconnected = (reason?: DisconnectReason) => {
      const name = reasonName(reason);
      if (reason !== undefined && VOLUNTARY.has(reason)) {
        push('participant_left', { reason: name, message: 'Participant left the room' });
        return;
      }
      push('disconnected', { reason: name, message: 'Participant disconnected' });
      requestFlush();
    };
    const onQuality = (quality: string, participant: Participant) => {
      if (participant.identity !== room.localParticipant.identity) return;
      if (!sawQuality) {
        sawQuality = true;
        previousQuality = quality;
        if (quality === 'poor' || quality === 'lost') {
          push('quality_changed', { quality, previousQuality: null });
          requestFlush();
        }
        return;
      }
      if (quality === previousQuality) return;
      const before = previousQuality;
      previousQuality = quality;
      if (quality === 'poor' || quality === 'lost' || before === 'poor' || before === 'lost') {
        push('quality_changed', { quality, previousQuality: before });
        requestFlush();
      }
    };
    const onLocalPublished = (publication: TrackPublication) => {
      if (publication.source !== Track.Source.Microphone) return;
      push('audio_published', { audioTrackState: publication.isMuted ? 'muted' : 'published' });
    };
    const onLocalUnpublished = (publication: TrackPublication) => {
      if (publication.source !== Track.Source.Microphone) return;
      push('audio_unpublished', { audioTrackState: 'unpublished' });
    };
    const onSubscription = (remoteIdentity: string, subscriptionState: string) => {
      push('audio_subscription_changed', { remoteIdentity, subscriptionState });
    };
    const onMuted = (publication: TrackPublication, participant: Participant) => {
      if (publication.source !== Track.Source.Microphone) return;
      if (participant.identity === room.localParticipant.identity) {
        push('audio_muted', { audioTrackState: 'muted' });
        return;
      }
      if (!subscriptions) return;
      subscriptions.set(participant.identity, 'muted');
      onSubscription(participant.identity, 'muted');
    };
    const onUnmuted = (publication: TrackPublication, participant: Participant) => {
      if (publication.source !== Track.Source.Microphone) return;
      if (participant.identity === room.localParticipant.identity) {
        push('audio_unmuted', { audioTrackState: 'published' });
        return;
      }
      if (!subscriptions) return;
      subscriptions.set(participant.identity, 'subscribed');
      onSubscription(participant.identity, 'subscribed');
    };
    const onSubscribed = (_track: unknown, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (!subscriptions || isAuxiliaryParticipant(participant) || publication.source !== Track.Source.Microphone) return;
      if (subscriptions.has(participant.identity)) return;
      subscriptions.set(participant.identity, publication.isMuted ? 'muted' : 'subscribed');
      onSubscription(participant.identity, publication.isMuted ? 'muted' : 'subscribed');
    };
    const onUnsubscribed = (_track: unknown, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (!subscriptions || isAuxiliaryParticipant(participant) || publication.source !== Track.Source.Microphone) return;
      if (!subscriptions.has(participant.identity)) return;
      subscriptions.delete(participant.identity);
      onSubscription(participant.identity, 'unsubscribed');
    };
    const onStream = (publication: RemoteTrackPublication, streamState: Track.StreamState, participant: RemoteParticipant) => {
      if (publication.source !== Track.Source.Microphone || isAuxiliaryParticipant(participant)) return;
      push('audio_stream_changed', {
        remoteIdentity: participant.identity,
        subscriptionState: streamState,
      });
    };
    const onDevices = (error: Error, kind?: MediaDeviceKind) => {
      push('livekit_error', { message: errorText(error), device: kind ?? null });
      requestFlush();
    };
    const onSubscribeFailed = (trackSid: string, _participant: RemoteParticipant, reason?: unknown) => {
      const code = typeof reason === 'string' || typeof reason === 'number' ? String(reason).slice(0, 80) : null;
      push('livekit_error', { message: 'Track subscription failed', trackSid, reason: code });
      requestFlush();
    };
    const onOffline = () => {
      push('browser_offline', { online: false, message: 'Browser reported the network as offline' });
      requestFlush();
    };
    const onOnline = () => {
      push('browser_online', { online: true, message: 'Browser reported the network as online' });
      requestFlush();
    };
    const onVisibility = () => {
      const visibility = browserVisibility();
      push('browser_visibility_changed', {
        visibility,
        message: visibility === 'visible' ? 'Page became visible' : 'Page was hidden',
      });
    };
    let lastEffective = effectiveType();
    const onNetwork = () => {
      const next = effectiveType();
      if (!next || next === lastEffective) return;
      const previous = lastEffective;
      lastEffective = next;
      push('browser_network_changed', {
        networkType: next,
        previousNetworkType: previous,
        message: 'Browser network type changed',
      });
      requestFlush();
    };

    const unsubscribeWhiteboard = subscribeWhiteboard(onWhiteboard);

    room
      .on(RoomEvent.Reconnecting, onReconnecting)
      .on(RoomEvent.Reconnected, onReconnected)
      .on(RoomEvent.SignalReconnecting, onSignal)
      .on(RoomEvent.Disconnected, onDisconnected)
      .on(RoomEvent.ConnectionQualityChanged, onQuality)
      .on(RoomEvent.LocalTrackPublished, onLocalPublished)
      .on(RoomEvent.LocalTrackUnpublished, onLocalUnpublished)
      .on(RoomEvent.TrackMuted, onMuted)
      .on(RoomEvent.TrackUnmuted, onUnmuted)
      .on(RoomEvent.TrackSubscribed, onSubscribed)
      .on(RoomEvent.TrackUnsubscribed, onUnsubscribed)
      .on(RoomEvent.TrackStreamStateChanged, onStream)
      .on(RoomEvent.MediaDevicesError, onDevices)
      .on(RoomEvent.TrackSubscriptionFailed, onSubscribeFailed);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    const connection = browserConnection();
    connection?.addEventListener('change', onNetwork);

    const buildReport = (
      leaving: boolean,
      whiteboard: WhiteboardCounts,
      board: BoardLink | null,
      messages: WhiteboardMessageTrace[],
      mainThreadGapMs: number | null,
    ): DiagnosticsReport | null => {
      const identity = room.localParticipant.identity;
      if (!identity) return null;
      const microphone = localMicrophone(room);
      const info = room.serverInfo;
      const bitrate = microphone.publishing ? latest?.sendBitrateKbps ?? null : latest?.receiveBitrateKbps ?? null;
      const publisher = transportOf(room, 'publisher');
      const subscriber = transportOf(room, 'subscriber');
      return {
        courseId,
        roomKey,
        secondary,
        leaving,
        clientNow: new Date().toISOString(),
        whiteboardMessages: messages.length > 0 ? messages : undefined,
        self: {
          identity,
          displayName: room.localParticipant.name?.trim() || 'Participant',
          connectionState: room.state,
          quality: room.localParticipant.connectionQuality || 'unknown',
          rttMs: metric(latest?.rttMs ?? null),
          sendLossPct: metric(latest?.sendLossPct ?? null),
          receiveLossPct: metric(latest?.receiveLossPct ?? null),
          jitterMs: metric(latest?.jitterMs ?? null),
          audioBitrateKbps: metric(bitrate),
          audioTrackState: microphone.state,
          micPublishing: microphone.publishing,
          subscribedAudioCount: subscribedMicrophones(room).size,
          iceState: readTransportState(publisher, (value) => value.getICEConnectionState()) ?? latest?.iceState ?? null,
          iceSubscriberState: readTransportState(subscriber, (value) => value.getICEConnectionState()),
          dtlsState: latest?.dtlsState ?? null,
          candidateRoute: sanitizeRoute(latest?.candidateRoute ?? null),
          reportedNetworkType: sanitizeNetworkType(latest?.reportedNetworkType ?? null),
          reportedRegion: clip(info?.region, 80),
          reportedNodeId: clip(info?.nodeId, 80),
          serverVersion: clip(info?.version, 40),
          reconnecting: room.state === 'reconnecting' || room.state === 'signalReconnecting',
          publisherPcState: readTransportState(publisher, (value) => value.getConnectionState()),
          subscriberPcState: readTransportState(subscriber, (value) => value.getConnectionState()),
          browserOnline: navigator.onLine,
          pageVisibility: browserVisibility(),
          effectiveType: effectiveType(),
          dataChannelState: latest?.dataChannelState ?? null,
          packetsSent: count(latest?.packetsSentDelta ?? null),
          packetsReceived: count(latest?.packetsReceivedDelta ?? null),
          pathBytesSent: count(latest?.pathBytesSentDelta ?? null),
          pathBytesReceived: count(latest?.pathBytesReceivedDelta ?? null),
          dataMessagesSent: count(latest?.dataMessagesSentDelta ?? null),
          dataMessagesReceived: count(latest?.dataMessagesReceivedDelta ?? null),
          dataBytesSent: count(latest?.dataBytesSentDelta ?? null),
          dataBytesReceived: count(latest?.dataBytesReceivedDelta ?? null),
          whiteboardSent: whiteboard.sent,
          whiteboardReceived: whiteboard.received,
          whiteboardPointerSent: whiteboard.pointerSent,
          whiteboardPointerReceived: whiteboard.pointerReceived,
          whiteboardErrors: whiteboard.sendErrors + whiteboard.receiveErrors,
          whiteboardSkipped: whiteboard.skipped,
          whiteboardPublishMs: metric(whiteboard.maxPublishMs),
          mainThreadGapMs,
          boardConnectionState: board?.state ?? null,
          boardIceState: board?.ice ?? null,
          boardPcState: board?.pc ?? null,
          boardDataChannelState: board?.dataChannelState ?? null,
          boardMessagesSent: count(board?.dataMessagesSent ?? null),
          boardMessagesReceived: count(board?.dataMessagesReceived ?? null),
        },
        events: pending.splice(0, pending.length),
      };
    };

    const restore = (events: DiagnosticEventInput[]) => {
      pending.unshift(...events);
      if (pending.length > 25) pending.splice(0, pending.length - 25);
    };

    const send = async (report: DiagnosticsReport, beacon: boolean): Promise<boolean> => {
      const json = JSON.stringify(report);
      try {
        if (beacon && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([json], { type: 'application/json' });
          if (navigator.sendBeacon('/api/livekit/diagnostics', blob)) return true;
        }
        const response = await fetch('/api/livekit/diagnostics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
          keepalive: beacon,
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    const readBoardLink = async (): Promise<BoardLink | null> => {
      const board = whiteboardRooms().find((candidate) => candidate !== room) ?? null;
      if (!board) {
        boardRoomSeen = null;
        boardCounters = null;
        return null;
      }
      if (board !== boardRoomSeen) {
        boardRoomSeen = board;
        boardCounters = null;
        previousBoard = null;
      }
      let ice: string | null = null;
      let pc: string | null = null;
      try {
        ice = board.engine.pcManager?.publisher?.getICEConnectionState() ?? null;
        pc = board.engine.pcManager?.publisher?.getConnectionState() ?? null;
      } catch {
        ice = null;
        pc = null;
      }
      const reports = await readStats(board);
      const parsed = parseConnectionMetrics(reports, boardCounters, Date.now());
      boardCounters = parsed.counters;
      return {
        state: board.state,
        ice,
        pc,
        dataChannelState: parsed.metrics.dataChannelState,
        dataMessagesSent: parsed.metrics.dataMessagesSentDelta,
        dataMessagesReceived: parsed.metrics.dataMessagesReceivedDelta,
      };
    };

    const flush = async (leaving: boolean) => {
      if (leaving) {
        leaveRequested = true;
        window.clearInterval(timer);
        window.clearInterval(watchTimer);
        window.clearTimeout(flushSoon);
      }
      if (flushing || (stopped && !leaving) || (leaveRequested && !leaving)) return;
      flushing = true;
      inFlush = true;
      const isLeave = leaving;
      let whiteboard: WhiteboardCounts | null = null;
      let messages: WhiteboardMessageTrace[] | null = null;
      let mainThread: number | null = null;
      const restoreDiagnostics = () => {
        if (whiteboard) restoreWhiteboardCounts(whiteboard);
        if (messages) restoreWhiteboardMessages(messages);
        if (mainThread !== null) restoreMainThreadGap(mainThread);
      };
      try {
        rebind();
        const reports = await readStats(room);
        const parsed = parseConnectionMetrics(reports, counters, Date.now());
        counters = parsed.counters;
        latest = parsed.metrics;
        const transition = degradationTransition(degraded, {
          quality: room.localParticipant.connectionQuality,
          rttMs: parsed.metrics.rttMs,
          sendLossPct: parsed.metrics.sendLossPct,
          receiveLossPct: parsed.metrics.receiveLossPct,
          jitterMs: parsed.metrics.jitterMs,
        });
        if (transition === 'degraded') {
          degraded = true;
          push('network_degraded', { message: 'Connection metrics crossed a degradation threshold' });
        } else if (transition === 'recovered') {
          degraded = false;
          push('network_recovered', { message: 'Connection metrics returned below the degradation threshold' });
        }
        observeDtls(parsed.metrics.dtlsState);
        observeData(parsed.metrics.dataChannelState);
        const board = await readBoardLink();
        latestBoard = board;
        if (board) observeBoard(board);
        else previousBoard = null;
        if (!subscriptions) subscriptions = subscribedMicrophones(room);
        whiteboard = takeWhiteboardCounts();
        messages = takeWhiteboardMessages();
        mainThread = takeMainThreadGap();

        const report = buildReport(isLeave, whiteboard, latestBoard, sanitizeWhiteboardMessages(messages), mainThread);
        if (!report) {
          restoreDiagnostics();
          return;
        }
        const sent = await send(report, isLeave);
        if (!sent) {
          restore(report.events);
          restoreDiagnostics();
          if (Date.now() - loggedFailureAt > 30_000) {
            loggedFailureAt = Date.now();
            console.error('LiveKit diagnostics report failed');
          }
        }
      } catch (error) {
        restoreDiagnostics();
        if (Date.now() - loggedFailureAt > 30_000) {
          loggedFailureAt = Date.now();
          console.error('LiveKit diagnostics report failed', error instanceof Error ? error.message : 'unknown');
        }
      } finally {
        inFlush = false;
        flushing = false;
        if (leaveRequested && leaveAttempts < 2 && pending.length > 0) {
          leaveAttempts += 1;
          void flush(true);
        }
      }
    };

    push('participant_joined', { message: 'Participant joined' });
    if (room.state === 'connected') push('connected', { message: 'Connected' });
    const microphone = localMicrophone(room);
    if (microphone.publishing) push('audio_published', { audioTrackState: microphone.state });
    rebind();

    const started = window.setTimeout(() => void flush(false), 1000 + Math.floor(Math.random() * 4000));
    timer = window.setInterval(() => void flush(false), 12000);
    let lastWatch = Date.now();
    watchTimer = window.setInterval(() => {
      const now = Date.now();
      const gap = now - lastWatch - 2000;
      lastWatch = now;
      if (gap >= 400) noteMainThreadGap(gap);
      rebind();
    }, 2000);
    const onHide = () => void flush(true);
    window.addEventListener('pagehide', onHide);

    return () => {
      stopped = true;
      window.clearTimeout(started);
      window.clearTimeout(flushSoon);
      window.clearInterval(timer);
      window.clearInterval(watchTimer);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      connection?.removeEventListener('change', onNetwork);
      unsubscribeWhiteboard();
      detachPublisher();
      detachSubscriber();
      room
        .off(RoomEvent.Reconnecting, onReconnecting)
        .off(RoomEvent.Reconnected, onReconnected)
        .off(RoomEvent.SignalReconnecting, onSignal)
        .off(RoomEvent.Disconnected, onDisconnected)
        .off(RoomEvent.ConnectionQualityChanged, onQuality)
        .off(RoomEvent.LocalTrackPublished, onLocalPublished)
        .off(RoomEvent.LocalTrackUnpublished, onLocalUnpublished)
        .off(RoomEvent.TrackMuted, onMuted)
        .off(RoomEvent.TrackUnmuted, onUnmuted)
        .off(RoomEvent.TrackSubscribed, onSubscribed)
        .off(RoomEvent.TrackUnsubscribed, onUnsubscribed)
        .off(RoomEvent.TrackStreamStateChanged, onStream)
        .off(RoomEvent.MediaDevicesError, onDevices)
        .off(RoomEvent.TrackSubscriptionFailed, onSubscribeFailed);
      void flush(true);
    };
  }, [courseId, room, roomKey, secondary]);

  return null;
}
