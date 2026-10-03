import {
  classifyHistory,
  classifyLive,
  cleanDisplayName,
  simultaneousProblemNote,
  worstHealth,
  type DiagnosticSample,
  type HealthLevel,
  type ParticipantHealth,
  type PresenceLevel,
  type ServerRoomSnapshot,
} from '@/lib/livekit/diagnostics/model';

export interface ParticipantRecord {
  id: string;
  identity: string;
  userId: string;
  displayName: string;
  role: string;
  secondary: boolean;
  connectionState: string;
  quality: string;
  reconnects: number;
  disconnects: number;
  reconnectingSince: Date | null;
  rttMs: number | null;
  avgRttMs: number | null;
  maxRttMs: number | null;
  rttSampleCount: number;
  sendLossPct: number | null;
  avgSendLossPct: number | null;
  maxSendLossPct: number | null;
  sendLossSampleCount: number;
  receiveLossPct: number | null;
  avgReceiveLossPct: number | null;
  maxReceiveLossPct: number | null;
  receiveLossSampleCount: number;
  jitterMs: number | null;
  avgJitterMs: number | null;
  maxJitterMs: number | null;
  jitterSampleCount: number;
  audioBitrateKbps: number | null;
  audioTrackState: string | null;
  micPublishing: boolean;
  subscribedAudioCount: number;
  iceState: string | null;
  iceSubscriberState: string | null;
  dtlsState: string | null;
  candidateRoute: string | null;
  reportedNetworkType: string | null;
  reportedRegion: string | null;
  reportedNodeId: string | null;
  serverState: string | null;
  serverRegion: string | null;
  serverAudioPublished: boolean | null;
  serverSeenAt: Date | null;
  lastDisconnectReason: string | null;
  joinedAt: Date;
  leftAt: Date | null;
  lastSeenAt: Date;
  samples: unknown;
}

export interface EventRecord {
  id: string;
  occurredAt: Date;
  kind: string;
  participant: string;
  identity: string;
  role: string;
  detail: unknown;
}

export interface SessionRecord {
  id: string;
  publicId: string;
  courseId: string;
  roomName: string;
  roomKey: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  lastActivityAt: Date;
  teacherName: string | null;
  studentCount: number;
  reconnects: number;
  disconnects: number;
  avgRttMs: number | null;
  maxRttMs: number | null;
  avgPacketLossPct: number | null;
  maxPacketLossPct: number | null;
  serverRegion: string | null;
  serverNodeId: string | null;
  serverVersion: string | null;
  serverSnapshot: unknown;
}

export interface DiagnosticsParticipantLine {
  name: string;
  role: string;
  secondary: boolean;
  health: HealthLevel;
  presence: PresenceLevel;
  reconnects: number;
  disconnects: number;
  signals: string[];
}

export interface DiagnosticsListItem {
  id: string;
  publicId: string;
  courseId: string;
  courseTitle: string | null;
  roomName: string;
  roomKey: string;
  status: 'active' | 'ended';
  health: HealthLevel;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  teacherName: string | null;
  studentCount: number;
  reconnects: number;
  disconnects: number;
  avgRttMs: number | null;
  maxRttMs: number | null;
  avgPacketLossPct: number | null;
  maxPacketLossPct: number | null;
  notableEvents: number;
  participantsAffected: number;
  participants: DiagnosticsParticipantLine[];
  signals: string[];
}

export interface DiagnosticsEventView {
  id: string;
  occurredAt: string;
  kind: string;
  participant: string;
  identity: string;
  role: string;
  detail: Record<string, string | number | boolean | null>;
}

export interface DiagnosticsParticipantView extends DiagnosticsParticipantLine {
  id: string;
  identity: string;
  connectionState: string;
  quality: string;
  rttMs: number | null;
  avgRttMs: number | null;
  maxRttMs: number | null;
  sendLossPct: number | null;
  receiveLossPct: number | null;
  avgSendLossPct: number | null;
  maxSendLossPct: number | null;
  avgReceiveLossPct: number | null;
  maxReceiveLossPct: number | null;
  jitterMs: number | null;
  avgJitterMs: number | null;
  maxJitterMs: number | null;
  audioBitrateKbps: number | null;
  audioTrackState: string | null;
  micPublishing: boolean;
  subscribedAudioCount: number;
  iceState: string | null;
  iceSubscriberState: string | null;
  dtlsState: string | null;
  candidateRoute: string | null;
  reportedNetworkType: string | null;
  reportedRegion: string | null;
  reportedNodeId: string | null;
  serverState: string | null;
  serverRegion: string | null;
  serverAudioPublished: boolean | null;
  serverSeenAt: string | null;
  lastDisconnectReason: string | null;
  joinedAt: string;
  leftAt: string | null;
  lastSeenAt: string;
  samples: DiagnosticSample[];
}

export interface DiagnosticsSessionDetail extends DiagnosticsListItem {
  serverRegion: string | null;
  serverNodeId: string | null;
  serverVersion: string | null;
  serverSnapshot: ServerRoomSnapshot | null;
  simultaneousNote: string | null;
  participantDetails: DiagnosticsParticipantView[];
  events: DiagnosticsEventView[];
}

function finite(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function readSamples(value: unknown): DiagnosticSample[] {
  if (!Array.isArray(value)) return [];
  const samples: DiagnosticSample[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.t !== 'string') continue;
    samples.push({
      t: row.t,
      rttMs: readNumber(row.rttMs),
      sendLossPct: readNumber(row.sendLossPct),
      receiveLossPct: readNumber(row.receiveLossPct),
      jitterMs: readNumber(row.jitterMs),
      bitrateKbps: readNumber(row.bitrateKbps),
      quality: typeof row.quality === 'string' ? row.quality : 'unknown',
      state: typeof row.state === 'string' ? row.state : 'unknown',
      ice: typeof row.ice === 'string' ? row.ice : null,
      pc: readText(row.pc),
      subscriberPc: readText(row.subscriberPc),
      subscriberIce: readText(row.subscriberIce),
      dtls: readText(row.dtls),
      online: readBool(row.online),
      visibility: readText(row.visibility),
      effectiveType: readText(row.effectiveType),
      packetsSent: readNumber(row.packetsSent),
      packetsReceived: readNumber(row.packetsReceived),
      pathBytesSent: readNumber(row.pathBytesSent),
      pathBytesReceived: readNumber(row.pathBytesReceived),
      dataChannelState: readText(row.dataChannelState),
      dataMessagesSent: readNumber(row.dataMessagesSent),
      dataMessagesReceived: readNumber(row.dataMessagesReceived),
      dataBytesSent: readNumber(row.dataBytesSent),
      dataBytesReceived: readNumber(row.dataBytesReceived),
      whiteboardSent: readNumber(row.whiteboardSent),
      whiteboardReceived: readNumber(row.whiteboardReceived),
      whiteboardPointerSent: readNumber(row.whiteboardPointerSent),
      whiteboardPointerReceived: readNumber(row.whiteboardPointerReceived),
      whiteboardErrors: readNumber(row.whiteboardErrors),
      whiteboardSkipped: readNumber(row.whiteboardSkipped),
      whiteboardPublishMs: readNumber(row.whiteboardPublishMs),
      clockOffsetMs: readNumber(row.clockOffsetMs),
      boardState: readText(row.boardState),
      boardIce: readText(row.boardIce),
      boardPc: readText(row.boardPc),
      boardDataState: readText(row.boardDataState),
      boardMessagesSent: readNumber(row.boardMessagesSent),
      boardMessagesReceived: readNumber(row.boardMessagesReceived),
    });
  }
  return samples;
}

function readSnapshot(value: unknown): ServerRoomSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.checkedAt !== 'string' || typeof row.roomExists !== 'boolean') return null;
  const participants: ServerRoomSnapshot['participants'] = [];
  if (Array.isArray(row.participants)) {
    for (const item of row.participants) {
      if (!item || typeof item !== 'object') continue;
      const person = item as Record<string, unknown>;
      if (typeof person.identity !== 'string' || typeof person.state !== 'string') continue;
      participants.push({
        identity: person.identity,
        name: typeof person.name === 'string' ? person.name : 'Participant',
        state: person.state,
        region: typeof person.region === 'string' ? person.region : null,
        isPublisher: person.isPublisher === true,
        audioPublished: person.audioPublished === true,
        disconnectReason: typeof person.disconnectReason === 'string' ? person.disconnectReason : null,
      });
    }
  }
  return {
    checkedAt: row.checkedAt,
    roomExists: row.roomExists,
    participantCount: readNumber(row.participantCount),
    participants,
  };
}

function readDetail(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const detail: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') detail[key] = item;
    else if (typeof item === 'number' && Number.isFinite(item)) detail[key] = item;
  }
  return detail;
}

function hasMeasurement(row: ParticipantRecord): boolean {
  return (
    row.rttSampleCount > 0 ||
    row.sendLossSampleCount > 0 ||
    row.receiveLossSampleCount > 0 ||
    row.jitterSampleCount > 0 ||
    row.quality === 'excellent' ||
    row.quality === 'good' ||
    row.quality === 'poor' ||
    row.quality === 'lost'
  );
}

export function healthFor(row: ParticipantRecord, status: 'active' | 'ended', nowMs: number): ParticipantHealth {
  const input = {
    connectionState: row.connectionState,
    quality: row.quality,
    reconnects: row.reconnects,
    disconnects: row.disconnects,
    rttMs: finite(row.rttMs),
    sendLossPct: finite(row.sendLossPct),
    receiveLossPct: finite(row.receiveLossPct),
    jitterMs: finite(row.jitterMs),
    maxRttMs: finite(row.maxRttMs),
    maxSendLossPct: finite(row.maxSendLossPct),
    maxReceiveLossPct: finite(row.maxReceiveLossPct),
    maxJitterMs: finite(row.maxJitterMs),
    hasMeasurement: hasMeasurement(row),
    leftAt: row.leftAt?.toISOString() ?? null,
    lastSeenAt: row.lastSeenAt.toISOString(),
    lastDisconnectReason: row.lastDisconnectReason,
    reconnectingSince: row.reconnectingSince?.toISOString() ?? null,
    nowMs,
  };
  return status === 'active' ? classifyLive(input) : classifyHistory(input);
}

function line(row: ParticipantRecord, health: ParticipantHealth): DiagnosticsParticipantLine {
  return {
    name: cleanDisplayName(row.displayName),
    role: row.role,
    secondary: row.secondary,
    health: health.health,
    presence: health.presence,
    reconnects: row.reconnects,
    disconnects: row.disconnects,
    signals: health.signals,
  };
}

function affected(rows: ParticipantRecord[], status: 'active' | 'ended', nowMs: number): number {
  const users = new Set<string>();
  for (const row of rows) {
    const health = healthFor(row, status, nowMs);
    if (health.health === 'degraded' || health.health === 'critical') users.add(row.userId);
  }
  return users.size;
}

export function toListItem(
  session: SessionRecord,
  participants: ParticipantRecord[],
  notableEvents: number,
  courseTitle: string | null,
  nowMs: number,
): DiagnosticsListItem {
  const status = session.status === 'active' ? 'active' : 'ended';
  const endMs = session.endedAt?.getTime() ?? nowMs;
  const assessed = participants.map((row) => ({ row, health: healthFor(row, status, nowMs) }));
  const signals = [...new Set(assessed.flatMap((item) => item.health.signals))].slice(0, 6);
  return {
    id: session.id,
    publicId: session.publicId,
    courseId: session.courseId,
    courseTitle,
    roomName: session.roomName,
    roomKey: session.roomKey,
    status,
    health: worstHealth(assessed.map((item) => item.health.health)),
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    durationMs: Math.max(0, endMs - session.startedAt.getTime()),
    teacherName: session.teacherName,
    studentCount: session.studentCount,
    reconnects: session.reconnects,
    disconnects: session.disconnects,
    avgRttMs: finite(session.avgRttMs),
    maxRttMs: finite(session.maxRttMs),
    avgPacketLossPct: finite(session.avgPacketLossPct),
    maxPacketLossPct: finite(session.maxPacketLossPct),
    notableEvents,
    participantsAffected: affected(participants, status, nowMs),
    participants: assessed.map((item) => line(item.row, item.health)),
    signals,
  };
}

export function toParticipantView(row: ParticipantRecord, status: 'active' | 'ended', nowMs: number): DiagnosticsParticipantView {
  return {
    ...line(row, healthFor(row, status, nowMs)),
    id: row.id,
    identity: row.identity,
    connectionState: row.connectionState,
    quality: row.quality,
    rttMs: finite(row.rttMs),
    avgRttMs: finite(row.avgRttMs),
    maxRttMs: finite(row.maxRttMs),
    sendLossPct: finite(row.sendLossPct),
    receiveLossPct: finite(row.receiveLossPct),
    avgSendLossPct: finite(row.avgSendLossPct),
    maxSendLossPct: finite(row.maxSendLossPct),
    avgReceiveLossPct: finite(row.avgReceiveLossPct),
    maxReceiveLossPct: finite(row.maxReceiveLossPct),
    jitterMs: finite(row.jitterMs),
    avgJitterMs: finite(row.avgJitterMs),
    maxJitterMs: finite(row.maxJitterMs),
    audioBitrateKbps: finite(row.audioBitrateKbps),
    audioTrackState: row.audioTrackState,
    micPublishing: row.micPublishing,
    subscribedAudioCount: row.subscribedAudioCount,
    iceState: row.iceState,
    iceSubscriberState: row.iceSubscriberState,
    dtlsState: row.dtlsState,
    candidateRoute: row.candidateRoute,
    reportedNetworkType: row.reportedNetworkType,
    reportedRegion: row.reportedRegion,
    reportedNodeId: row.reportedNodeId,
    serverState: row.serverState,
    serverRegion: row.serverRegion,
    serverAudioPublished: row.serverAudioPublished,
    serverSeenAt: row.serverSeenAt?.toISOString() ?? null,
    lastDisconnectReason: row.lastDisconnectReason,
    joinedAt: row.joinedAt.toISOString(),
    leftAt: row.leftAt?.toISOString() ?? null,
    lastSeenAt: row.lastSeenAt.toISOString(),
    samples: readSamples(row.samples),
  };
}

export function toSessionDetail(
  session: SessionRecord,
  participants: ParticipantRecord[],
  events: EventRecord[],
  notableEvents: number,
  courseTitle: string | null,
  nowMs: number,
): DiagnosticsSessionDetail {
  const views = events.map((event) => ({
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    kind: event.kind,
    participant: event.participant,
    identity: event.identity,
    role: event.role,
    detail: readDetail(event.detail),
  }));
  return {
    ...toListItem(session, participants, notableEvents, courseTitle, nowMs),
    serverRegion: session.serverRegion,
    serverNodeId: session.serverNodeId,
    serverVersion: session.serverVersion,
    serverSnapshot: readSnapshot(session.serverSnapshot),
    simultaneousNote: simultaneousProblemNote(views),
    participantDetails: participants.map((row) => toParticipantView(row, session.status === 'active' ? 'active' : 'ended', nowMs)),
    events: views,
  };
}
