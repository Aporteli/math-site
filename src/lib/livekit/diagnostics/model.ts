export const DIAGNOSTIC_EVENT_KINDS = [
  'connected',
  'disconnected',
  'reconnecting',
  'reconnected',
  'signal_reconnecting',
  'quality_changed',
  'participant_joined',
  'participant_left',
  'audio_published',
  'audio_unpublished',
  'audio_muted',
  'audio_unmuted',
  'audio_subscription_changed',
  'audio_stream_changed',
  'network_degraded',
  'network_recovered',
  'ice_state_changed',
  'livekit_error',
  'server_mismatch',
  'pc_state_changed',
  'dtls_state_changed',
  'data_channel_changed',
  'browser_offline',
  'browser_online',
  'browser_network_changed',
  'browser_visibility_changed',
  'whiteboard_send_failed',
  'whiteboard_send_skipped',
  'whiteboard_receive_failed',
  'board_link_changed',
] as const;

export type DiagnosticEventKind = (typeof DIAGNOSTIC_EVENT_KINDS)[number];

export const NOTABLE_EVENT_KINDS: readonly DiagnosticEventKind[] = [
  'disconnected',
  'reconnecting',
  'signal_reconnecting',
  'quality_changed',
  'audio_unpublished',
  'audio_subscription_changed',
  'audio_stream_changed',
  'network_degraded',
  'ice_state_changed',
  'livekit_error',
  'server_mismatch',
  'pc_state_changed',
  'dtls_state_changed',
  'data_channel_changed',
  'browser_offline',
  'browser_network_changed',
  'whiteboard_send_failed',
  'whiteboard_send_skipped',
  'whiteboard_receive_failed',
  'board_link_changed',
];

export const THRESHOLDS = {
  lossDegraded: 5,
  lossCritical: 15,
  rttDegradedMs: 250,
  rttCriticalMs: 800,
  jitterDegradedMs: 30,
  prolongedReconnectingMs: 15_000,
  silenceMs: 25_000,
} as const;

export type HealthLevel = 'healthy' | 'degraded' | 'critical' | 'unknown';
export type PresenceLevel = 'connected' | 'reconnecting' | 'disconnected' | 'left';

export interface DiagnosticSample {
  t: string;
  rttMs: number | null;
  sendLossPct: number | null;
  receiveLossPct: number | null;
  jitterMs: number | null;
  bitrateKbps: number | null;
  quality: string;
  state: string;
  ice: string | null;
  pc?: string | null;
  subscriberPc?: string | null;
  subscriberIce?: string | null;
  dtls?: string | null;
  online?: boolean | null;
  visibility?: string | null;
  effectiveType?: string | null;
  packetsSent?: number | null;
  packetsReceived?: number | null;
  pathBytesSent?: number | null;
  pathBytesReceived?: number | null;
  dataChannelState?: string | null;
  dataMessagesSent?: number | null;
  dataMessagesReceived?: number | null;
  dataBytesSent?: number | null;
  dataBytesReceived?: number | null;
  whiteboardSent?: number | null;
  whiteboardReceived?: number | null;
  whiteboardPointerSent?: number | null;
  whiteboardPointerReceived?: number | null;
  whiteboardErrors?: number | null;
  whiteboardSkipped?: number | null;
  whiteboardPublishMs?: number | null;
  clockOffsetMs?: number | null;
  boardState?: string | null;
  boardIce?: string | null;
  boardPc?: string | null;
  boardDataState?: string | null;
  boardMessagesSent?: number | null;
  boardMessagesReceived?: number | null;
}

export interface ServerParticipantSnapshot {
  identity: string;
  name: string;
  state: string;
  region: string | null;
  isPublisher: boolean;
  audioPublished: boolean;
  disconnectReason: string | null;
}

export interface ServerRoomSnapshot {
  checkedAt: string;
  roomExists: boolean;
  participantCount: number | null;
  participants: ServerParticipantSnapshot[];
}

export interface ParticipantHealthInput {
  connectionState: string;
  quality: string;
  reconnects: number;
  disconnects: number;
  rttMs: number | null;
  sendLossPct: number | null;
  receiveLossPct: number | null;
  jitterMs: number | null;
  maxRttMs: number | null;
  maxSendLossPct: number | null;
  maxReceiveLossPct: number | null;
  maxJitterMs: number | null;
  hasMeasurement: boolean;
  leftAt: string | null;
  lastSeenAt: string;
  lastDisconnectReason: string | null;
  reconnectingSince: string | null;
  nowMs: number;
}

export interface ParticipantHealth {
  presence: PresenceLevel;
  health: HealthLevel;
  signals: string[];
}

const VOLUNTARY_REASONS = new Set(['CLIENT_INITIATED', 'ROOM_DELETED', 'ROOM_CLOSED']);

export function isUnexpectedDisconnectReason(reason: string | null): boolean {
  if (!reason) return false;
  return !VOLUNTARY_REASONS.has(reason);
}

export function reasonSignal(reason: string | null): string | null {
  if (!reason || !/^[A-Z0-9_]+$/.test(reason)) return null;
  return `LiveKit disconnect reason: ${reason}`;
}

function rankOf(level: HealthLevel): number {
  switch (level) {
    case 'critical':
      return 3;
    case 'degraded':
      return 2;
    case 'healthy':
      return 1;
    default:
      return 0;
  }
}

function levelOf(rank: number): HealthLevel {
  if (rank >= 3) return 'critical';
  if (rank >= 2) return 'degraded';
  if (rank >= 1) return 'healthy';
  return 'unknown';
}

function worse(current: HealthLevel, next: HealthLevel): HealthLevel {
  return rankOf(next) > rankOf(current) ? next : current;
}

interface SignalBuilder {
  signals: string[];
  rank: number;
  add: (level: 'degraded' | 'critical', signal: string) => void;
}

function builder(): SignalBuilder {
  const signals: string[] = [];
  return {
    signals,
    rank: 0,
    add(level, signal) {
      if (!signals.includes(signal)) signals.push(signal);
      this.rank = Math.max(this.rank, level === 'critical' ? 3 : 2);
    },
  };
}

function lossSignals(
  target: SignalBuilder,
  sendLoss: number | null,
  receiveLoss: number | null,
): void {
  if (sendLoss !== null) {
    if (sendLoss >= THRESHOLDS.lossCritical) {
      target.add('critical', 'Publisher audio packet loss is elevated');
    } else if (sendLoss >= THRESHOLDS.lossDegraded) {
      target.add('degraded', 'Publisher audio packet loss is elevated');
    }
  }
  if (receiveLoss !== null) {
    if (receiveLoss >= THRESHOLDS.lossCritical) {
      target.add('critical', 'Incoming audio packet loss is elevated');
    } else if (receiveLoss >= THRESHOLDS.lossDegraded) {
      target.add('degraded', 'Incoming audio packet loss is elevated');
    }
  }
}

function pathSignals(target: SignalBuilder, rttMs: number | null, jitterMs: number | null): void {
  if (rttMs !== null) {
    if (rttMs >= THRESHOLDS.rttCriticalMs) target.add('critical', 'Round-trip time is elevated');
    else if (rttMs >= THRESHOLDS.rttDegradedMs) target.add('degraded', 'Round-trip time is elevated');
  }
  if (jitterMs !== null && jitterMs >= THRESHOLDS.jitterDegradedMs) {
    target.add('degraded', 'Jitter is elevated');
  }
}

function reconnectSignals(target: SignalBuilder, reconnects: number, currentlyReconnecting: boolean): void {
  if (reconnects >= 2) {
    target.add('critical', 'Connection repeatedly entered reconnecting state');
    return;
  }
  if (currentlyReconnecting) {
    target.add('degraded', 'Connection is reconnecting');
    return;
  }
  if (reconnects === 1) target.add('degraded', 'Connection entered reconnecting state');
}

export function presenceOf(input: ParticipantHealthInput): PresenceLevel {
  if (input.leftAt) return 'left';
  const seen = Date.parse(input.lastSeenAt);
  const silent = Number.isFinite(seen) && input.nowMs - seen > THRESHOLDS.silenceMs;
  if (input.connectionState === 'disconnected' || silent) return 'disconnected';
  if (
    input.connectionState === 'reconnecting' ||
    input.connectionState === 'connecting' ||
    input.connectionState === 'signalReconnecting'
  ) {
    return 'reconnecting';
  }
  if (input.connectionState === 'connected') return 'connected';
  return 'disconnected';
}

export function classifyHistory(input: ParticipantHealthInput): ParticipantHealth {
  const target = builder();
  if (input.disconnects > 0) target.add('critical', 'Participant disconnected unexpectedly');
  reconnectSignals(target, input.reconnects, false);
  lossSignals(target, input.maxSendLossPct, input.maxReceiveLossPct);
  pathSignals(target, input.maxRttMs, input.maxJitterMs);
  const reason = reasonSignal(input.lastDisconnectReason);
  if (reason && input.disconnects > 0) target.add('critical', reason);

  let health = levelOf(target.rank);
  if (health === 'unknown' && input.hasMeasurement) health = 'healthy';
  return { presence: 'left', health, signals: target.signals };
}

export function classifyLive(input: ParticipantHealthInput): ParticipantHealth {
  const presence = presenceOf(input);
  if (presence === 'left') {
    const history = classifyHistory(input);
    return { ...history, presence: 'left' };
  }

  const target = builder();
  const seen = Date.parse(input.lastSeenAt);
  const silent = Number.isFinite(seen) && input.nowMs - seen > THRESHOLDS.silenceMs;
  if (presence === 'disconnected') {
    if (silent && input.connectionState !== 'disconnected') {
      target.add('degraded', 'Client stopped reporting diagnostics');
    } else {
      target.add('critical', 'Participant disconnected');
      const reason = reasonSignal(input.lastDisconnectReason);
      if (reason) target.add('critical', reason);
    }
  }

  const reconnectingSince = input.reconnectingSince ? Date.parse(input.reconnectingSince) : Number.NaN;
  const prolonged =
    presence === 'reconnecting' &&
    Number.isFinite(reconnectingSince) &&
    input.nowMs - reconnectingSince >= THRESHOLDS.prolongedReconnectingMs;
  if (prolonged) target.add('critical', 'Connection remained in reconnecting state');
  reconnectSignals(target, input.reconnects, presence === 'reconnecting');

  if (input.quality === 'lost') target.add('critical', 'Connection quality reported as lost');
  else if (input.quality === 'poor') target.add('degraded', 'Connection quality reported as poor');

  lossSignals(target, input.sendLossPct, input.receiveLossPct);
  pathSignals(target, input.rttMs, input.jitterMs);

  if (input.disconnects > 0 && presence === 'connected') {
    target.add('degraded', 'Participant disconnected earlier in this session');
    const reason = reasonSignal(input.lastDisconnectReason);
    if (reason) target.signals.push(reason);
  }

  let health = levelOf(target.rank);
  if (health === 'unknown' && presence === 'connected' && (input.hasMeasurement || input.quality === 'excellent' || input.quality === 'good')) {
    health = 'healthy';
  }
  return { presence, health, signals: target.signals };
}

export function worstHealth(levels: HealthLevel[]): HealthLevel {
  return levels.reduce<HealthLevel>((current, level) => worse(current, level), 'unknown');
}

export interface DegradationInput {
  quality: string;
  rttMs: number | null;
  sendLossPct: number | null;
  receiveLossPct: number | null;
  jitterMs: number | null;
}

export function isDegradedSample(input: DegradationInput): boolean {
  if (input.quality === 'poor' || input.quality === 'lost') return true;
  if (input.sendLossPct !== null && input.sendLossPct >= THRESHOLDS.lossDegraded) return true;
  if (input.receiveLossPct !== null && input.receiveLossPct >= THRESHOLDS.lossDegraded) return true;
  if (input.rttMs !== null && input.rttMs >= THRESHOLDS.rttDegradedMs) return true;
  if (input.jitterMs !== null && input.jitterMs >= THRESHOLDS.jitterDegradedMs) return true;
  return false;
}

export function degradationTransition(
  wasDegraded: boolean,
  input: DegradationInput,
): 'degraded' | 'recovered' | null {
  const degraded = isDegradedSample(input);
  if (degraded && !wasDegraded) return 'degraded';
  if (!degraded && wasDegraded) return 'recovered';
  return null;
}

export interface TimedEvent {
  occurredAt: string;
  identity: string;
  kind: string;
}

const SIMULTANEOUS_KINDS = new Set<string>([
  'disconnected',
  'reconnecting',
  'signal_reconnecting',
  'network_degraded',
  'quality_changed',
  'ice_state_changed',
  'livekit_error',
  'server_mismatch',
  'pc_state_changed',
  'dtls_state_changed',
  'data_channel_changed',
  'browser_offline',
  'whiteboard_send_failed',
  'whiteboard_send_skipped',
  'whiteboard_receive_failed',
  'board_link_changed',
]);

export function simultaneousProblemNote(events: TimedEvent[]): string | null {
  const problems = events
    .filter((event) => SIMULTANEOUS_KINDS.has(event.kind))
    .map((event) => ({ ...event, at: Date.parse(event.occurredAt) }))
    .filter((event) => Number.isFinite(event.at))
    .sort((left, right) => left.at - right.at);

  for (let index = 0; index < problems.length; index += 1) {
    const start = problems[index];
    if (!start) continue;
    const identities = new Set<string>([start.identity]);
    for (let next = index + 1; next < problems.length; next += 1) {
      const candidate = problems[next];
      if (!candidate || candidate.at - start.at > 10_000) break;
      identities.add(candidate.identity);
    }
    if (identities.size >= 2) {
      return 'Multiple participants recorded connection problems within 10 seconds.';
    }
  }
  return null;
}

export function sanitizeRoute(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return null;
  if (/\d{1,3}(?:\.\d{1,3}){3}/.test(trimmed) || trimmed.includes(':')) return null;
  if (!/^[a-z0-9_./ >-]+$/i.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeNetworkType(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,20}$/.test(normalized)) return null;
  return normalized;
}

export function cleanDisplayName(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 80);
  return cleaned || 'Participant';
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatSessionWhen(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return '—';
  const end = endedAt ? new Date(endedAt) : null;
  const day = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const startTime = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const endTime =
    end && !Number.isNaN(end.getTime())
      ? end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : 'now';
  return `${day} — ${startTime}–${endTime}`;
}

export function formatMs(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'unavailable';
  return `${Math.round(value)} ms`;
}

export function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'unavailable';
  return `${value.toFixed(1)}%`;
}

export function formatKbps(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'unavailable';
  return `${Math.round(value)} kbps`;
}

export const EVENT_LABELS: Record<DiagnosticEventKind, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting',
  reconnected: 'Reconnected',
  signal_reconnecting: 'Signal reconnecting',
  quality_changed: 'Connection quality changed',
  participant_joined: 'Participant joined',
  participant_left: 'Participant left',
  audio_published: 'Audio track published',
  audio_unpublished: 'Audio track unpublished',
  audio_muted: 'Microphone muted',
  audio_unmuted: 'Microphone unmuted',
  audio_subscription_changed: 'Audio subscription changed',
  audio_stream_changed: 'Subscribed audio stream state changed',
  network_degraded: 'Connection metrics degraded',
  network_recovered: 'Connection metrics recovered',
  ice_state_changed: 'ICE connection state changed',
  livekit_error: 'LiveKit error',
  server_mismatch: 'Server participant list does not match the client',
  pc_state_changed: 'WebRTC connection state changed',
  dtls_state_changed: 'DTLS state changed',
  data_channel_changed: 'Data channel state changed',
  browser_offline: 'Browser went offline',
  browser_online: 'Browser came online',
  browser_network_changed: 'Browser network type changed',
  browser_visibility_changed: 'Page visibility changed',
  whiteboard_send_failed: 'Whiteboard send failed',
  whiteboard_send_skipped: 'Whiteboard send skipped',
  whiteboard_receive_failed: 'Whiteboard receive failed',
  board_link_changed: 'Whiteboard link changed',
};

export function eventLabel(kind: string): string {
  if ((DIAGNOSTIC_EVENT_KINDS as readonly string[]).includes(kind)) {
    return EVENT_LABELS[kind as DiagnosticEventKind];
  }
  return kind;
}

export function isNotableKind(kind: string): boolean {
  return (NOTABLE_EVENT_KINDS as readonly string[]).includes(kind);
}

const SAMPLE_MIN_GAP_MS = 7_000;
const SAMPLE_QUIET_GAP_MS = 15_000;
const SAMPLE_DENSE_WINDOW_MS = 8 * 60_000;
const SAMPLE_SPARSE_GAP_MS = 60_000;
const SAMPLE_CAP = 360;

function sampleText(value: string | null | undefined): string | null {
  return value ?? null;
}

function metricJump(previous: number | null, next: number | null, threshold: number): boolean {
  if (previous === null && next === null) return false;
  if (previous === null || next === null) return true;
  return Math.abs(previous - next) >= threshold;
}

export function sampleChanged(previous: DiagnosticSample, next: DiagnosticSample): boolean {
  if (
    previous.quality !== next.quality ||
    previous.state !== next.state ||
    sampleText(previous.ice) !== sampleText(next.ice) ||
    sampleText(previous.pc) !== sampleText(next.pc) ||
    sampleText(previous.subscriberPc) !== sampleText(next.subscriberPc) ||
    sampleText(previous.subscriberIce) !== sampleText(next.subscriberIce) ||
    sampleText(previous.dtls) !== sampleText(next.dtls) ||
    sampleText(previous.dataChannelState) !== sampleText(next.dataChannelState) ||
    sampleText(previous.effectiveType) !== sampleText(next.effectiveType) ||
    sampleText(previous.visibility) !== sampleText(next.visibility) ||
    sampleText(previous.boardState) !== sampleText(next.boardState) ||
    sampleText(previous.boardIce) !== sampleText(next.boardIce) ||
    sampleText(previous.boardPc) !== sampleText(next.boardPc) ||
    sampleText(previous.boardDataState) !== sampleText(next.boardDataState) ||
    (previous.online ?? null) !== (next.online ?? null)
  ) {
    return true;
  }
  if (metricJump(previous.rttMs, next.rttMs, 50)) return true;
  if (metricJump(previous.sendLossPct, next.sendLossPct, 1)) return true;
  if (metricJump(previous.receiveLossPct, next.receiveLossPct, 1)) return true;
  if (metricJump(previous.jitterMs, next.jitterMs, 10)) return true;
  if ((next.whiteboardErrors ?? 0) > 0 || (next.whiteboardSkipped ?? 0) > 0) return true;
  const previousFlow = (previous.whiteboardSent ?? 0) + (previous.whiteboardReceived ?? 0) > 0;
  const nextFlow = (next.whiteboardSent ?? 0) + (next.whiteboardReceived ?? 0) > 0;
  if (previousFlow !== nextFlow) return true;
  const previousPointer = (previous.whiteboardPointerSent ?? 0) + (previous.whiteboardPointerReceived ?? 0) > 0;
  const nextPointer = (next.whiteboardPointerSent ?? 0) + (next.whiteboardPointerReceived ?? 0) > 0;
  if (previousPointer !== nextPointer) return true;
  const previousData = (previous.dataMessagesSent ?? 0) + (previous.dataMessagesReceived ?? 0) > 0;
  const nextData = (next.dataMessagesSent ?? 0) + (next.dataMessagesReceived ?? 0) > 0;
  if (previousData !== nextData) return true;
  const previousPackets = (previous.packetsSent ?? 0) + (previous.packetsReceived ?? 0) > 0;
  const nextPackets = (next.packetsSent ?? 0) + (next.packetsReceived ?? 0) > 0;
  return previousPackets !== nextPackets;
}

export function compactDiagnosticSamples(samples: DiagnosticSample[], nowMs: number): DiagnosticSample[] {
  const denseAfter = nowMs - SAMPLE_DENSE_WINDOW_MS;
  const kept: DiagnosticSample[] = [];
  for (const sample of samples) {
    const at = Date.parse(sample.t);
    const previous = kept.at(-1);
    if (!previous || !Number.isFinite(at)) {
      kept.push(sample);
      continue;
    }
    const recent = at >= denseAfter;
    const gap = at - Date.parse(previous.t);
    if (recent || gap >= SAMPLE_SPARSE_GAP_MS || sampleChanged(previous, sample)) kept.push(sample);
  }
  if (kept.length > SAMPLE_CAP) return kept.slice(kept.length - SAMPLE_CAP);
  return kept;
}

export function appendDiagnosticSample(
  existing: DiagnosticSample[],
  sample: DiagnosticSample,
  nowMs: number,
): DiagnosticSample[] {
  const last = existing.at(-1);
  if (last) {
    const gap = nowMs - Date.parse(last.t);
    if (!Number.isFinite(gap) || gap < SAMPLE_MIN_GAP_MS) return existing;
    if (gap < SAMPLE_QUIET_GAP_MS && !sampleChanged(last, sample)) return existing;
  }
  return compactDiagnosticSamples([...existing, sample], nowMs);
}

export function isAroundClock(iso: string, targetMinute: number, windowMinutes: number): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const minute = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const diff = Math.abs(minute - targetMinute);
  return Math.min(diff, 24 * 60 - diff) <= windowMinutes;
}

export function incidentInstants(
  serverIso: string,
  clockOffsetMs: number | null | undefined,
  clientIso?: string | null,
): string[] {
  const times = [serverIso];
  if (clientIso) times.push(clientIso);
  if (typeof clockOffsetMs === 'number' && Number.isFinite(clockOffsetMs) && Math.abs(clockOffsetMs) >= 2000) {
    const clientMs = Date.parse(serverIso) - clockOffsetMs;
    if (Number.isFinite(clientMs)) times.push(new Date(clientMs).toISOString());
  }
  return times;
}

export function matchesIncidentWindow(instants: readonly string[], targetMinute: number, windowMinutes: number): boolean {
  return instants.some((iso) => isAroundClock(iso, targetMinute, windowMinutes));
}
