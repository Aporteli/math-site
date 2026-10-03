import { z } from 'zod';
import { DIAGNOSTIC_EVENT_KINDS } from './model';

const metric = z.number().finite().min(0).max(120_000).nullable();
const count = z.number().finite().min(0).max(50_000_000).nullable();
const shortText = z.string().trim().min(1).max(80);
const identity = z.string().trim().min(1).max(120);
const stateText = z.string().trim().max(40).nullable();

export const diagnosticDetailSchema = z.object({
  rttMs: metric.optional(),
  packetLossPct: metric.optional(),
  receiveLossPct: metric.optional(),
  jitterMs: metric.optional(),
  bitrateKbps: metric.optional(),
  quality: z.string().trim().max(40).nullable().optional(),
  previousQuality: z.string().trim().max(40).nullable().optional(),
  reason: z.string().trim().max(80).nullable().optional(),
  ice: z.string().trim().max(40).nullable().optional(),
  previousIce: z.string().trim().max(40).nullable().optional(),
  message: z.string().trim().max(240).nullable().optional(),
  audioTrackState: z.string().trim().max(40).nullable().optional(),
  subscriptionState: z.string().trim().max(40).nullable().optional(),
  remoteIdentity: identity.optional(),
  trackSid: z.string().trim().max(80).nullable().optional(),
  device: z.string().trim().max(40).nullable().optional(),
  pc: stateText.optional(),
  previousPc: stateText.optional(),
  subscriberPc: stateText.optional(),
  subscriberIce: stateText.optional(),
  previousSubscriberIce: stateText.optional(),
  dtls: stateText.optional(),
  previousDtls: stateText.optional(),
  side: z.enum(['publisher', 'subscriber', 'board']).optional(),
  online: z.boolean().nullable().optional(),
  visibility: z.enum(['visible', 'hidden']).optional(),
  networkType: z.string().trim().max(20).nullable().optional(),
  previousNetworkType: z.string().trim().max(20).nullable().optional(),
  dataChannelState: stateText.optional(),
  previousDataChannelState: stateText.optional(),
  whiteboardType: z.string().trim().max(40).nullable().optional(),
  boardState: stateText.optional(),
  previousBoardState: stateText.optional(),
  boardIce: stateText.optional(),
  previousBoardIce: stateText.optional(),
  boardPc: stateText.optional(),
  previousBoardPc: stateText.optional(),
});

export const diagnosticEventSchema = z.object({
  kind: z.enum(DIAGNOSTIC_EVENT_KINDS),
  occurredAt: z.string().datetime(),
  dedupeKey: z.string().trim().min(8).max(80),
  detail: diagnosticDetailSchema.optional(),
});

export const diagnosticsReportSchema = z.object({
  courseId: z.string().trim().min(1).max(64),
  roomKey: z.enum(['main', 'a', 'b']),
  secondary: z.boolean(),
  leaving: z.boolean(),
  self: z.object({
    identity,
    displayName: shortText,
    connectionState: z.string().trim().min(1).max(40),
    quality: z.string().trim().min(1).max(40),
    rttMs: metric,
    sendLossPct: metric,
    receiveLossPct: metric,
    jitterMs: metric,
    audioBitrateKbps: metric,
    audioTrackState: z.enum(['published', 'muted', 'unpublished']).nullable(),
    micPublishing: z.boolean(),
    subscribedAudioCount: z.number().int().min(0).max(100),
    iceState: z.string().trim().max(40).nullable(),
    iceSubscriberState: z.string().trim().max(40).nullable(),
    dtlsState: z.string().trim().max(40).nullable(),
    candidateRoute: z.string().trim().max(80).nullable(),
    reportedNetworkType: z.string().trim().max(20).nullable(),
    reportedRegion: z.string().trim().max(80).nullable(),
    reportedNodeId: z.string().trim().max(80).nullable(),
    serverVersion: z.string().trim().max(40).nullable(),
    reconnecting: z.boolean(),
    publisherPcState: stateText.optional(),
    subscriberPcState: stateText.optional(),
    browserOnline: z.boolean().nullable().optional(),
    pageVisibility: z.enum(['visible', 'hidden']).optional(),
    effectiveType: z.string().trim().max(20).nullable().optional(),
    dataChannelState: stateText.optional(),
    packetsSent: count.optional(),
    packetsReceived: count.optional(),
    pathBytesSent: count.optional(),
    pathBytesReceived: count.optional(),
    dataMessagesSent: count.optional(),
    dataMessagesReceived: count.optional(),
    dataBytesSent: count.optional(),
    dataBytesReceived: count.optional(),
    whiteboardSent: count.optional(),
    whiteboardReceived: count.optional(),
    whiteboardPointerSent: count.optional(),
    whiteboardPointerReceived: count.optional(),
    whiteboardErrors: count.optional(),
    whiteboardSkipped: count.optional(),
    whiteboardPublishMs: metric.optional(),
    boardConnectionState: stateText.optional(),
    boardIceState: stateText.optional(),
    boardPcState: stateText.optional(),
    boardDataChannelState: stateText.optional(),
    boardMessagesSent: count.optional(),
    boardMessagesReceived: count.optional(),
  }),
  clientNow: z.string().datetime().optional(),
  events: z.array(diagnosticEventSchema).max(25),
});

export type DiagnosticsReport = z.infer<typeof diagnosticsReportSchema>;
export type DiagnosticEventInput = z.infer<typeof diagnosticEventSchema>;
export type DiagnosticEventDetail = z.infer<typeof diagnosticDetailSchema> & {
  serverState?: string | null;
  serverSeen?: boolean;
  serverRegion?: string | null;
  serverAudioPublished?: boolean | null;
  remoteParticipant?: string | null;
  clientOccurredAt?: string;
  clockOffsetMs?: number | null;
};
