import type { DiagnosticsReport } from '@/lib/livekit/diagnostics/contract';
import { sanitizeNetworkType, sanitizeRoute } from '@/lib/livekit/diagnostics/model';
import type { WhiteboardMessageTrace } from '@/lib/livekit/diagnostics/whiteboard-message';
import type { WhiteboardCounts } from '@/lib/livekit/diagnostics/whiteboard-trace';
import { localMicrophone, subscribedMicrophones } from './audio-tracks';
import { browserVisibility, effectiveType } from './browser';
import { clip, count, metric } from './format';
import type { DiagnosticsSession } from './session';
import { readTransportState, transportOf } from './transport';
import type { BoardLink } from './types';

export function bindBuildReport(session: DiagnosticsSession): void {
  session.buildReport = (
    leaving: boolean,
    whiteboard: WhiteboardCounts,
    board: BoardLink | null,
    messages: WhiteboardMessageTrace[],
    mainThreadGapMs: number | null,
  ): DiagnosticsReport | null => {
    const { room } = session;
    const identity = room.localParticipant.identity;
    if (!identity) return null;
    const microphone = localMicrophone(room);
    const info = room.serverInfo;
    const bitrate = microphone.publishing ? session.latest?.sendBitrateKbps ?? null : session.latest?.receiveBitrateKbps ?? null;
    const publisher = transportOf(room, 'publisher');
    const subscriber = transportOf(room, 'subscriber');
    return {
      courseId: session.courseId,
      roomKey: session.roomKey,
      secondary: session.secondary,
      leaving,
      clientNow: new Date().toISOString(),
      whiteboardMessages: messages.length > 0 ? messages : undefined,
      self: {
        identity,
        displayName: room.localParticipant.name?.trim() || 'Participant',
        connectionState: room.state,
        quality: room.localParticipant.connectionQuality || 'unknown',
        rttMs: metric(session.latest?.rttMs ?? null),
        sendLossPct: metric(session.latest?.sendLossPct ?? null),
        receiveLossPct: metric(session.latest?.receiveLossPct ?? null),
        jitterMs: metric(session.latest?.jitterMs ?? null),
        audioBitrateKbps: metric(bitrate),
        audioTrackState: microphone.state,
        micPublishing: microphone.publishing,
        subscribedAudioCount: subscribedMicrophones(room).size,
        iceState: readTransportState(publisher, (value) => value.getICEConnectionState()) ?? session.latest?.iceState ?? null,
        iceSubscriberState: readTransportState(subscriber, (value) => value.getICEConnectionState()),
        dtlsState: session.latest?.dtlsState ?? null,
        candidateRoute: sanitizeRoute(session.latest?.candidateRoute ?? null),
        reportedNetworkType: sanitizeNetworkType(session.latest?.reportedNetworkType ?? null),
        reportedRegion: clip(info?.region, 80),
        reportedNodeId: clip(info?.nodeId, 80),
        serverVersion: clip(info?.version, 40),
        reconnecting: room.state === 'reconnecting' || room.state === 'signalReconnecting',
        publisherPcState: readTransportState(publisher, (value) => value.getConnectionState()),
        subscriberPcState: readTransportState(subscriber, (value) => value.getConnectionState()),
        browserOnline: navigator.onLine,
        pageVisibility: browserVisibility(),
        effectiveType: effectiveType(),
        dataChannelState: session.latest?.dataChannelState ?? null,
        packetsSent: count(session.latest?.packetsSentDelta ?? null),
        packetsReceived: count(session.latest?.packetsReceivedDelta ?? null),
        pathBytesSent: count(session.latest?.pathBytesSentDelta ?? null),
        pathBytesReceived: count(session.latest?.pathBytesReceivedDelta ?? null),
        dataMessagesSent: count(session.latest?.dataMessagesSentDelta ?? null),
        dataMessagesReceived: count(session.latest?.dataMessagesReceivedDelta ?? null),
        dataBytesSent: count(session.latest?.dataBytesSentDelta ?? null),
        dataBytesReceived: count(session.latest?.dataBytesReceivedDelta ?? null),
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
      events: session.pending.splice(0, session.pending.length),
    };
  };
}
