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

const BAD_ICE = new Set(['failed', 'disconnected', 'closed']);
const VOLUNTARY = new Set<DisconnectReason>([
  DisconnectReason.CLIENT_INITIATED,
  DisconnectReason.ROOM_DELETED,
  DisconnectReason.ROOM_CLOSED,
]);

function clip(value: string | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function metric(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return Math.min(value, 120_000);
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

function iceState(room: Room, side: 'publisher' | 'subscriber'): string | null {
  const manager = room.engine.pcManager;
  if (!manager) return null;
  const transport = side === 'publisher' ? manager.publisher : manager.subscriber;
  if (!transport) return null;
  try {
    return transport.getICEConnectionState();
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

function shouldEmitIce(previous: string | null, next: string | null): boolean {
  if (!next || next === previous || previous === null) return false;
  if (BAD_ICE.has(next)) return true;
  return (next === 'connected' || next === 'completed') && BAD_ICE.has(previous);
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
    let timer = 0;
    let sawQuality = false;
    let degraded = false;
    let signalAt = 0;
    let loggedFailureAt = 0;
    let counters: MetricCounters | null = null;
    let latest: ConnectionMetrics | null = null;
    let previousIce: string | null = null;
    let previousQuality: string | null = null;
    let subscriptions: Map<string, 'subscribed' | 'muted'> | null = null;
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
          ...detail,
        },
      });
      if (pending.length > 25) pending.splice(0, pending.length - 25);
    };

    const onReconnecting = () => push('reconnecting', { message: 'Connection entered reconnecting state' });
    const onReconnected = () => push('reconnected', { message: 'Connection reconnected' });
    const onSignal = () => {
      const now = Date.now();
      if (now - signalAt < 20_000) return;
      signalAt = now;
      push('signal_reconnecting', { message: 'Signal connection is reconnecting' });
    };
    const onDisconnected = (reason?: DisconnectReason) => {
      const name = reasonName(reason);
      if (reason !== undefined && VOLUNTARY.has(reason)) {
        push('participant_left', { reason: name, message: 'Participant left the room' });
        return;
      }
      push('disconnected', { reason: name, message: 'Participant disconnected' });
    };
    const onQuality = (quality: string, participant: Participant) => {
      if (participant.identity !== room.localParticipant.identity) return;
      if (!sawQuality) {
        sawQuality = true;
        previousQuality = quality;
        if (quality === 'poor' || quality === 'lost') {
          push('quality_changed', { quality, previousQuality: null });
        }
        return;
      }
      if (quality === previousQuality) return;
      const before = previousQuality;
      previousQuality = quality;
      if (quality === 'poor' || quality === 'lost' || before === 'poor' || before === 'lost') {
        push('quality_changed', { quality, previousQuality: before });
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
    };
    const onSubscribeFailed = (trackSid: string, _participant: RemoteParticipant, reason?: unknown) => {
      const code = typeof reason === 'string' || typeof reason === 'number' ? String(reason).slice(0, 80) : null;
      push('livekit_error', { message: 'Track subscription failed', trackSid, reason: code });
    };

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

    const buildReport = (leaving: boolean): DiagnosticsReport | null => {
      const identity = room.localParticipant.identity;
      if (!identity) return null;
      const microphone = localMicrophone(room);
      const info = room.serverInfo;
      const bitrate = microphone.publishing ? latest?.sendBitrateKbps ?? null : latest?.receiveBitrateKbps ?? null;
      return {
        courseId,
        roomKey,
        secondary,
        leaving,
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
          iceState: iceState(room, 'publisher') ?? latest?.iceState ?? null,
          iceSubscriberState: iceState(room, 'subscriber'),
          dtlsState: latest?.dtlsState ?? null,
          candidateRoute: sanitizeRoute(latest?.candidateRoute ?? null),
          reportedNetworkType: sanitizeNetworkType(latest?.reportedNetworkType ?? null),
          reportedRegion: clip(info?.region, 80),
          reportedNodeId: clip(info?.nodeId, 80),
          serverVersion: clip(info?.version, 40),
          reconnecting: room.state === 'reconnecting' || room.state === 'signalReconnecting',
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

    const flush = async (leaving: boolean) => {
      if (leaving) {
        leaveRequested = true;
        window.clearInterval(timer);
      }
      if (flushing || (stopped && !leaving) || (leaveRequested && !leaving)) return;
      flushing = true;
      const isLeave = leaving;
      try {
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
        const ice = iceState(room, 'publisher') ?? parsed.metrics.iceState;
        if (shouldEmitIce(previousIce, ice)) {
          push('ice_state_changed', { ice, previousIce });
        }
        previousIce = ice;
        if (!subscriptions) subscriptions = subscribedMicrophones(room);

        const report = buildReport(isLeave);
        if (!report) return;
        const sent = await send(report, isLeave);
        if (!sent) {
          restore(report.events);
          if (Date.now() - loggedFailureAt > 30_000) {
            loggedFailureAt = Date.now();
            console.error('LiveKit diagnostics report failed');
          }
        }
      } catch (error) {
        if (Date.now() - loggedFailureAt > 30_000) {
          loggedFailureAt = Date.now();
          console.error('LiveKit diagnostics report failed', error instanceof Error ? error.message : 'unknown');
        }
      } finally {
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

    const started = window.setTimeout(() => void flush(false), 1000);
    timer = window.setInterval(() => void flush(false), 8000);
    const onHide = () => void flush(true);
    window.addEventListener('pagehide', onHide);

    return () => {
      stopped = true;
      window.clearTimeout(started);
      window.clearInterval(timer);
      window.removeEventListener('pagehide', onHide);
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
