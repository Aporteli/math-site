'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type {
  DiagnosticsEventView,
  DiagnosticsListItem,
  DiagnosticsParticipantView,
  DiagnosticsSessionDetail,
} from '@/lib/livekit/diagnostics/dto';
import {
  eventLabel,
  formatClock,
  formatDuration,
  formatKbps,
  formatMs,
  formatPct,
  formatSessionWhen,
  incidentInstants,
  matchesIncidentWindow,
  type DiagnosticSample,
  type HealthLevel,
  type PresenceLevel,
} from '@/lib/livekit/diagnostics/model';

interface DiagnosticsListResponse {
  active: DiagnosticsListItem[];
  history: DiagnosticsListItem[];
}

const INCIDENT_WINDOW_MINUTES = 3;

const LIMITATIONS = [
  'RTT, packet loss, jitter, ICE, and bitrate come from each participant’s own WebRTC stats. A value stays unavailable when the browser does not report it.',
  'Server region is shown only when LiveKit reports one. A self-hosted server often leaves it empty.',
  'Connection quality is the participant’s own LiveKit quality, not a measurement of someone else.',
  'Health labels describe the telemetry. They do not identify a root cause.',
  'Metric samples are about every 15 seconds, and sooner when the path or whiteboard flow changes. Packets and bytes are the change since the previous sample.',
  'Whiteboard counts are messages this page sent or received. They do not change drawing. During a breakout, the separate whiteboard connection is labeled as the board link.',
];

function roleLabel(role: string): string {
  if (role === 'teacher') return 'Teacher';
  if (role === 'admin') return 'Admin';
  if (role === 'student') return 'Student';
  return 'Participant';
}

function roleRank(role: string): number {
  if (role === 'teacher') return 0;
  if (role === 'admin') return 1;
  if (role === 'student') return 2;
  return 3;
}

function tone(
  health: HealthLevel,
  presence: PresenceLevel,
): { dot: string; text: string; chip: string; label: string } {
  if (presence === 'disconnected') {
    return { dot: 'bg-slate-400', text: 'text-slate-700', chip: 'bg-slate-100 text-slate-700', label: 'Disconnected' };
  }
  if (presence === 'reconnecting' && health === 'critical') {
    return { dot: 'bg-rose-500', text: 'text-rose-700', chip: 'bg-rose-50 text-rose-700', label: 'Reconnecting' };
  }
  if (presence === 'reconnecting' || health === 'degraded') {
    return {
      dot: 'bg-amber-500',
      text: 'text-amber-800',
      chip: 'bg-amber-50 text-amber-800',
      label: presence === 'reconnecting' ? 'Reconnecting' : 'Degraded',
    };
  }
  if (health === 'critical') {
    return { dot: 'bg-rose-500', text: 'text-rose-700', chip: 'bg-rose-50 text-rose-700', label: 'Critical' };
  }
  if (health === 'healthy') {
    return {
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      chip: 'bg-emerald-50 text-emerald-700',
      label: 'Healthy',
    };
  }
  return { dot: 'bg-slate-300', text: 'text-slate-600', chip: 'bg-slate-100 text-slate-600', label: 'Unknown' };
}

function qualityLabel(quality: string): string {
  if (quality === 'excellent') return 'Excellent';
  if (quality === 'good') return 'Good';
  if (quality === 'poor') return 'Poor';
  if (quality === 'lost') return 'Lost';
  return 'Unknown';
}

function StatusMark({ health, presence }: { health: HealthLevel; presence: PresenceLevel }) {
  const style = tone(health, presence);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-box px-2 py-1 text-xs font-semibold ${style.chip}`}>
      <span className={`size-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-box bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function eventMetric(detail: DiagnosticsEventView['detail'], key: string): number | null {
  const value = detail[key];
  return typeof value === 'number' ? value : null;
}

function eventText(detail: DiagnosticsEventView['detail'], key: string): string | null {
  const value = detail[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseClockInput(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatBytes(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 1000) return `${Math.round(value)} B`;
  return `${Math.round(value / 1000)} KB`;
}

function phoneClock(serverIso: string, clockOffsetMs: number | null | undefined): string | null {
  if (typeof clockOffsetMs !== 'number' || Math.abs(clockOffsetMs) < 2000) return null;
  const clientMs = Date.parse(serverIso) - clockOffsetMs;
  if (!Number.isFinite(clientMs)) return null;
  return formatClock(new Date(clientMs).toISOString());
}

const PATH_SNAPSHOT_KINDS = new Set([
  'connected',
  'disconnected',
  'reconnecting',
  'reconnected',
  'signal_reconnecting',
  'quality_changed',
  'network_degraded',
  'network_recovered',
  'ice_state_changed',
  'pc_state_changed',
  'dtls_state_changed',
  'data_channel_changed',
  'browser_offline',
  'browser_online',
  'browser_network_changed',
  'browser_visibility_changed',
  'livekit_error',
  'server_mismatch',
  'board_link_changed',
  'whiteboard_send_failed',
  'whiteboard_send_skipped',
  'whiteboard_receive_failed',
]);

function transitionText(
  detail: DiagnosticsEventView['detail'],
  nextKey: string,
  previousKey: string,
  label: string,
  includeCurrent: boolean,
): string | null {
  const next = eventText(detail, nextKey);
  const previous = eventText(detail, previousKey);
  if (previous && next && previous !== next) return `${label} ${previous} → ${next}`;
  if (includeCurrent && next) return `${label} ${next}`;
  return null;
}

function sampleSummary(sample: DiagnosticSample): string {
  const parts = [
    `RTT ${formatMs(sample.rttMs)}`,
    `send loss ${formatPct(sample.sendLossPct)}`,
    `receive loss ${formatPct(sample.receiveLossPct)}`,
    `jitter ${formatMs(sample.jitterMs)}`,
    sample.quality,
    `LiveKit ${sample.state}`,
    `ICE ${sample.ice ?? 'unavailable'}`,
  ];
  if (sample.pc) parts.push(`WebRTC ${sample.pc}`);
  if (sample.subscriberIce) parts.push(`subscriber ICE ${sample.subscriberIce}`);
  if (sample.subscriberPc) parts.push(`subscriber WebRTC ${sample.subscriberPc}`);
  if (sample.dtls) parts.push(`DTLS ${sample.dtls}`);
  if (sample.online === false) parts.push('browser offline');
  else if (sample.online === true) parts.push('browser online');
  if (sample.visibility) parts.push(sample.visibility);
  if (sample.effectiveType) parts.push(sample.effectiveType);
  if (typeof sample.packetsSent === 'number' || typeof sample.packetsReceived === 'number') {
    parts.push(`packets ${sample.packetsSent ?? '—'}/${sample.packetsReceived ?? '—'}`);
  }
  const sentBytes = formatBytes(sample.pathBytesSent);
  const receivedBytes = formatBytes(sample.pathBytesReceived);
  if (sentBytes || receivedBytes) parts.push(`path ${sentBytes ?? '—'}/${receivedBytes ?? '—'}`);
  if (sample.dataChannelState) parts.push(`data ${sample.dataChannelState}`);
  if (typeof sample.dataMessagesSent === 'number' || typeof sample.dataMessagesReceived === 'number') {
    parts.push(`data msgs ${sample.dataMessagesSent ?? 0}/${sample.dataMessagesReceived ?? 0}`);
  }
  const dataSent = formatBytes(sample.dataBytesSent);
  const dataReceived = formatBytes(sample.dataBytesReceived);
  if (dataSent || dataReceived) parts.push(`data bytes ${dataSent ?? '—'}/${dataReceived ?? '—'}`);
  if (
    typeof sample.whiteboardSent === 'number' ||
    typeof sample.whiteboardReceived === 'number' ||
    typeof sample.whiteboardErrors === 'number'
  ) {
    parts.push(
      `whiteboard ${sample.whiteboardSent ?? 0} sent, ${sample.whiteboardReceived ?? 0} received, ${sample.whiteboardErrors ?? 0} errors`,
    );
  }
  if (typeof sample.whiteboardPointerSent === 'number' || typeof sample.whiteboardPointerReceived === 'number') {
    parts.push(`pointer ${sample.whiteboardPointerSent ?? 0}/${sample.whiteboardPointerReceived ?? 0}`);
  }
  if ((sample.whiteboardSkipped ?? 0) > 0) parts.push(`${sample.whiteboardSkipped} whiteboard sends skipped`);
  if (typeof sample.whiteboardPublishMs === 'number' && sample.whiteboardPublishMs >= 500) {
    parts.push(`whiteboard publish ${formatMs(sample.whiteboardPublishMs)}`);
  }
  if (sample.boardState || sample.boardIce || sample.boardPc) {
    parts.push(`board link ${sample.boardState ?? 'unavailable'} / ICE ${sample.boardIce ?? 'unavailable'} / WebRTC ${sample.boardPc ?? 'unavailable'}`);
  }
  return parts.join(' · ');
}

function ParticipantCard({ person }: { person: DiagnosticsParticipantView }) {
  const audioLabel = person.micPublishing ? 'Microphone bitrate' : 'Incoming audio bitrate';
  const latest = person.samples.at(-1) ?? null;
  const latestPhone = latest ? phoneClock(latest.t, latest.clockOffsetMs) : null;
  return (
    <article className="rounded-box border border-hairline p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ink">
            {roleLabel(person.role)}
            {person.secondary ? <span className="ml-2 text-xs font-medium text-muted">Second device</span> : null}
          </div>
          <div className="mt-0.5 text-sm text-body">{person.name}</div>
        </div>
        <StatusMark health={person.health} presence={person.presence} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Quality" value={qualityLabel(person.quality)} />
        <Metric label="RTT" value={formatMs(person.rttMs)} />
        <Metric label="Send loss" value={formatPct(person.sendLossPct)} />
        <Metric label="Receive loss" value={formatPct(person.receiveLossPct)} />
        <Metric label="Jitter" value={formatMs(person.jitterMs)} />
        <Metric label={audioLabel} value={formatKbps(person.audioBitrateKbps)} />
      </div>

      <dl className="mt-3 grid gap-1 text-xs text-body sm:grid-cols-2">
        <div>Reconnects: {person.reconnects}</div>
        <div>Disconnects: {person.disconnects}</div>
        <div>Microphone: {person.audioTrackState ?? 'unavailable'}</div>
        <div>Subscribed microphone tracks: {person.subscribedAudioCount}</div>
        <div>ICE: {person.iceState ?? 'unavailable'}</div>
        <div>Subscriber ICE: {person.iceSubscriberState ?? 'unavailable'}</div>
        <div>DTLS: {person.dtlsState ?? 'unavailable'}</div>
        <div>ICE route: {person.candidateRoute ?? 'unavailable'}</div>
        <div>Reported network: {person.reportedNetworkType ?? 'unavailable'}</div>
        <div>Server state: {person.serverState ?? 'unavailable'}</div>
        <div>Server region: {person.serverRegion ?? 'unavailable'}</div>
        <div>Region reported by client: {person.reportedRegion ?? 'unavailable'}</div>
        <div>Server node: {person.reportedNodeId ?? 'unavailable'}</div>
        <div>
          Server audio published:{' '}
          {person.serverAudioPublished === null ? 'unavailable' : person.serverAudioPublished ? 'yes' : 'no'}
        </div>
      </dl>

      {person.signals.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-body">
          {person.signals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 text-[11px] text-muted">
        Avg RTT {formatMs(person.avgRttMs)} · max {formatMs(person.maxRttMs)} · max send loss{' '}
        {formatPct(person.maxSendLossPct)} · max receive loss {formatPct(person.maxReceiveLossPct)}
      </div>
      {latest ? (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          Latest sample {formatClock(latest.t)}
          {latestPhone ? ` · phone ${latestPhone}` : ''}: {sampleSummary(latest)}
        </p>
      ) : null}
    </article>
  );
}

function EventRow({ event }: { event: DiagnosticsEventView }) {
  const rtt = eventMetric(event.detail, 'rttMs');
  const loss = eventMetric(event.detail, 'packetLossPct');
  const receiveLoss = eventMetric(event.detail, 'receiveLossPct');
  const jitter = eventMetric(event.detail, 'jitterMs');
  const reason = eventText(event.detail, 'reason');
  const message = eventText(event.detail, 'message');
  const remote = eventText(event.detail, 'remoteParticipant');
  const serverState = eventText(event.detail, 'serverState');
  const serverSeen = event.detail.serverSeen;
  const clientAt = eventText(event.detail, 'clientOccurredAt');
  const clockOffset = eventMetric(event.detail, 'clockOffsetMs');
  const phone =
    clientAt && typeof clockOffset === 'number' && Math.abs(clockOffset) >= 2000 ? formatClock(clientAt) : null;
  const includePath = PATH_SNAPSHOT_KINDS.has(event.kind);
  const transitions = [
    transitionText(event.detail, 'ice', 'previousIce', 'ICE', includePath),
    transitionText(event.detail, 'subscriberIce', 'previousSubscriberIce', 'Subscriber ICE', includePath),
    transitionText(event.detail, 'pc', 'previousPc', 'WebRTC', includePath),
    transitionText(event.detail, 'dtls', 'previousDtls', 'DTLS', includePath),
    transitionText(event.detail, 'dataChannelState', 'previousDataChannelState', 'Data channel', includePath),
    transitionText(event.detail, 'networkType', 'previousNetworkType', 'Network', includePath),
    transitionText(event.detail, 'boardState', 'previousBoardState', 'Board link', includePath),
    transitionText(event.detail, 'boardIce', 'previousBoardIce', 'Board ICE', includePath),
    transitionText(event.detail, 'boardPc', 'previousBoardPc', 'Board WebRTC', includePath),
  ].filter((item): item is string => Boolean(item));
  const whiteboardType = eventText(event.detail, 'whiteboardType');
  const side = eventText(event.detail, 'side');
  const visibility = eventText(event.detail, 'visibility');
  return (
    <li className="rounded-box border border-hairline px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-xs text-muted">
          {formatClock(event.occurredAt)}
          {phone ? ` · phone ${phone}` : ''}
        </span>
        <span className="text-xs text-muted">
          {roleLabel(event.role)} · {event.participant}
        </span>
      </div>
      <div className="mt-1 text-sm font-medium text-ink">{eventLabel(event.kind)}</div>
      {message ? <p className="mt-1 text-xs text-body">{message}</p> : null}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        {reason ? <span>Reason {reason}</span> : null}
        {side ? <span>Side {side}</span> : null}
        {rtt !== null ? <span>RTT {formatMs(rtt)}</span> : null}
        {loss !== null ? <span>Send loss {formatPct(loss)}</span> : null}
        {receiveLoss !== null ? <span>Receive loss {formatPct(receiveLoss)}</span> : null}
        {jitter !== null ? <span>Jitter {formatMs(jitter)}</span> : null}
        {transitions.map((item) => (
          <span key={item}>{item}</span>
        ))}
        {event.detail.online === false ? <span>Browser offline</span> : null}
        {event.kind === 'browser_online' ? <span>Browser online</span> : null}
        {visibility && (visibility === 'hidden' || event.kind === 'browser_visibility_changed') ? (
          <span>Page {visibility}</span>
        ) : null}
        {whiteboardType ? <span>Message {whiteboardType}</span> : null}
        {remote ? <span>Remote {remote}</span> : null}
        {typeof serverSeen === 'boolean' ? (
          <span>Server lists participant: {serverSeen ? (serverState ?? 'yes') : 'no'}</span>
        ) : null}
      </div>
    </li>
  );
}

function SampleRow({ sample, name }: { sample: DiagnosticSample; name: string }) {
  const phone = phoneClock(sample.t, sample.clockOffsetMs);
  return (
    <li className="rounded-box border border-dashed border-hairline px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-xs text-muted">
          {formatClock(sample.t)}
          {phone ? ` · phone ${phone}` : ''}
        </span>
        <span className="text-xs text-muted">{name}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-ink">Metric sample</div>
      <p className="mt-1 text-[11px] leading-5 text-muted">{sampleSummary(sample)}</p>
    </li>
  );
}

function SessionButton({
  item,
  selected,
  onSelect,
}: {
  item: DiagnosticsListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const headline = tone(item.health, item.status === 'active' ? 'connected' : 'left');
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={[
        'w-full rounded-box border p-3 text-left transition',
        selected ? 'border-navy/40 bg-navy-tint' : 'border-hairline bg-white hover:border-navy/30',
      ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">Session #{item.publicId}</span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${headline.text}`}>
          <span className={`size-2 rounded-full ${headline.dot}`} />
          {headline.label}
        </span>
      </div>
      <div className="mt-1 text-xs text-body">{formatSessionWhen(item.startedAt, item.endedAt)}</div>
      <div className="mt-1 truncate text-xs text-muted">{item.courseTitle ?? item.roomName}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <span>{formatDuration(item.durationMs)}</span>
        <span>{item.studentCount} students</span>
        <span>{item.reconnects} reconnects</span>
        <span>{item.disconnects} disconnects</span>
      </div>
      {item.notableEvents > 0 ? (
        <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-800">
          <AlertTriangle className="size-3.5" />
          {item.notableEvents} connection events
        </div>
      ) : null}
    </button>
  );
}

export function LiveKitDiagnostics() {
  const [list, setList] = useState<DiagnosticsListResponse | null>(null);
  const [detail, setDetail] = useState<DiagnosticsSessionDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [focusIdentity, setFocusIdentity] = useState('all');
  const [around, setAround] = useState('');

  const loadList = useCallback(async () => {
    const response = await fetch('/api/livekit/diagnostics', { cache: 'no-store' });
    if (!response.ok) throw new Error('Diagnostics could not be loaded');
    return (await response.json()) as DiagnosticsListResponse;
  }, []);

  const loadDetail = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/livekit/diagnostics?sessionId=${encodeURIComponent(sessionId)}`, {
      cache: 'no-store',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Session diagnostics could not be loaded');
    return (await response.json()) as DiagnosticsSessionDetail;
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const nextList = await loadList();
      setList(nextList);
      setError(null);
      setSelectedId((current) => {
        if (current && [...nextList.active, ...nextList.history].some((item) => item.id === current)) return current;
        return nextList.active[0]?.id ?? nextList.history[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnostics could not be loaded');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      void refresh();
    };
    run();
    const timer = window.setInterval(run, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const run = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      void loadDetail(selectedId)
        .then((next) => {
          if (!cancelled) setDetail(next);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Session diagnostics could not be loaded');
        });
    };
    run();
    const timer = window.setInterval(run, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadDetail, selectedId]);

  const visibleDetail = detail?.id === selectedId ? detail : null;
  const people = [...(visibleDetail?.participantDetails ?? [])].sort((left, right) => {
    const rank = roleRank(left.role) - roleRank(right.role);
    if (rank !== 0) return rank;
    return left.name.localeCompare(right.name);
  });
  const focus = people.some((person) => person.identity === focusIdentity) ? focusIdentity : 'all';
  const targetMinute = parseClockInput(around);
  const timeline: Array<
    | { key: string; at: number; kind: 'event'; event: DiagnosticsEventView }
    | { key: string; at: number; kind: 'sample'; sample: DiagnosticSample; name: string }
  > = [];
  if (visibleDetail) {
    for (const event of visibleDetail.events) {
      if (focus !== 'all' && event.identity !== focus) continue;
      const clientAt = eventText(event.detail, 'clientOccurredAt');
      const instants = clientAt ? [event.occurredAt, clientAt] : [event.occurredAt];
      if (targetMinute !== null && !matchesIncidentWindow(instants, targetMinute, INCIDENT_WINDOW_MINUTES)) continue;
      timeline.push({ key: event.id, at: Date.parse(event.occurredAt), kind: 'event', event });
    }
    if (targetMinute !== null || focus !== 'all') {
      for (const person of people) {
        if (focus !== 'all' && person.identity !== focus) continue;
        const samples = targetMinute === null ? person.samples.slice(-12) : person.samples;
        samples.forEach((sample, index) => {
          if (
            targetMinute !== null &&
            !matchesIncidentWindow(incidentInstants(sample.t, sample.clockOffsetMs), targetMinute, INCIDENT_WINDOW_MINUTES)
          ) {
            return;
          }
          timeline.push({
            key: `${person.identity}:${sample.t}:${index}`,
            at: Date.parse(sample.t),
            kind: 'sample',
            sample,
            name: person.name,
          });
        });
      }
    }
    timeline.sort((left, right) => left.at - right.at);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Values refresh from live participant reports. Unavailable means the stat was not reported.
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-box border border-hairline px-3 py-2 text-sm font-medium text-ink transition hover:bg-slate-50">
          {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-box bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {loading && !list ? (
        <div className="rounded-box border border-dashed border-hairline p-8 text-center text-sm text-muted">
          Loading diagnostics…
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="rounded-box border border-hairline bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Active sessions</h3>
                <Activity className="size-4 text-muted" />
              </div>
              <div className="mt-3 space-y-2">
                {list && list.active.length > 0 ? (
                  list.active.map((item) => (
                    <SessionButton
                      key={item.id}
                      item={item}
                      selected={item.id === selectedId}
                      onSelect={setSelectedId}
                    />
                  ))
                ) : (
                  <div className="rounded-box border border-dashed border-hairline p-4 text-center text-sm text-muted">
                    No active sessions.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-box border border-hairline bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-ink">Previous sessions</h3>
              <div className="mt-3 space-y-2">
                {list && list.history.length > 0 ? (
                  list.history.map((item) => (
                    <SessionButton
                      key={item.id}
                      item={item}
                      selected={item.id === selectedId}
                      onSelect={setSelectedId}
                    />
                  ))
                ) : (
                  <div className="rounded-box border border-dashed border-hairline p-4 text-center text-sm text-muted">
                    No saved sessions yet.
                  </div>
                )}
              </div>
            </section>

            <section className="mt-4 rounded-box border border-hairline bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-ink">Diagnostics cheat sheet</h3>
              <p className="mt-1 text-xs text-muted">LiveKit-ის ძირითადი პარამეტრების მოკლე განმარტება.</p>

              <div className="mt-3 divide-y divide-hairline overflow-hidden rounded-box border border-hairline">
                {[
                  {
                    term: 'RTT',
                    full: 'Round-Trip Time',
                    description:
                      'დრო, რომელიც მონაცემს სჭირდება შენგან LiveKit-ის სერვერამდე მისასვლელად და პასუხის უკან დასაბრუნებლად.',
                  },
                  {
                    term: 'Avg RTT',
                    full: 'Average Round-Trip Time',
                    description: 'სესიის განმავლობაში დაფიქსირებული RTT-ის საშუალო მნიშვნელობა.',
                  },
                  {
                    term: 'Max RTT',
                    full: 'Maximum Round-Trip Time',
                    description:
                      'სესიაში დაფიქსირებული ყველაზე მაღალი RTT. დიდი ნახტომები შეიძლება ქსელის არასტაბილურობაზე მიუთითებდეს.',
                  },
                  {
                    term: 'Jitter',
                    full: 'Network Jitter',
                    description:
                      'აჩვენებს, რამდენად მერყეობს მონაცემების პაკეტების მოსვლის დრო. რაც უფრო დაბალი და სტაბილურია, მით უკეთესია.',
                  },
                  {
                    term: 'Send Loss',
                    full: 'Packet Loss — Sending',
                    description: 'მონაცემების რამდენი პროცენტი დაიკარგა შენი მოწყობილობიდან სერვერისკენ გაგზავნისას.',
                  },
                  {
                    term: 'Receive Loss',
                    full: 'Packet Loss — Receiving',
                    description: 'მონაცემების რამდენი პროცენტი დაიკარგა სერვერიდან შენს მოწყობილობამდე მიღებისას.',
                  },
                  {
                    term: 'Reconnects',
                    full: 'Reconnections',
                    description: 'რამდენჯერ გახდა საჭირო კავშირის ხელახლა დამყარება სესიის განმავლობაში.',
                  },
                  {
                    term: 'Disconnects',
                    full: 'Disconnections',
                    description: 'რამდენჯერ გაითიშა კავშირი სესიის განმავლობაში.',
                  },
                  {
                    term: 'ICE',
                    full: 'Interactive Connectivity Establishment',
                    description:
                      'WebRTC-ის მექანიზმი, რომელიც მოწყობილობასა და LiveKit-ის სერვერს შორის მოქმედ ქსელურ გზას პოულობს.',
                  },
                  {
                    term: 'DTLS',
                    full: 'Datagram Transport Layer Security',
                    description: 'უზრუნველყოფს WebRTC კავშირის უსაფრთხოებას და მონაცემების დაშიფვრას.',
                  },
                  {
                    term: 'ICE Route',
                    full: 'Interactive Connectivity Establishment Route',
                    description: 'აჩვენებს, რა ქსელური გზით გადის WebRTC-ის მედია-ტრეფიკი.',
                  },
                  {
                    term: 'Bitrate',
                    full: 'Audio Bitrate',
                    description: 'აჩვენებს, რამდენი აუდიო მონაცემი იგზავნება ან მიიღება წამში.',
                  },
                  {
                    term: 'Server State',
                    full: 'Server Connection State',
                    description: 'აჩვენებს LiveKit-ის სერვერთან კავშირის მიმდინარე მდგომარეობას.',
                  },
                  {
                    term: 'Server Node',
                    full: 'LiveKit Server Node',
                    description: 'კონკრეტული LiveKit სერვერი, რომელიც ამ კავშირს ამუშავებს.',
                  },
                  {
                    term: 'Server Region',
                    full: 'LiveKit Server Region',
                    description: 'გეოგრაფიული რეგიონი, რომელშიც LiveKit-ის სერვერია განთავსებული.',
                  },
                  {
                    term: 'Connection Metrics Degraded',
                    full: 'Connection Metrics Degraded',
                    description: 'კავშირის ხარისხი დროებით გაუარესდა და რომელიმე მეტრიკამ პრობლემურ ზღვარს გადააჭარბა.',
                  },
                  {
                    term: 'Connection Metrics Recovered',
                    full: 'Connection Metrics Recovered',
                    description: 'კავშირის ხარისხი კვლავ გაუმჯობესდა და მეტრიკები პრობლემურ ზღვარს ქვემოთ დაბრუნდა.',
                  },
                ].map((item) => (
                  <details key={item.term} className="group bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-black/[0.02]">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[12px] font-semibold text-ink">{item.term}</span>

                          <span className="truncate text-[10px] font-medium text-muted">{item.full}</span>
                        </div>
                      </div>

                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true">
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </summary>

                    <div className="border-t border-hairline bg-black/[0.015] px-3 py-2.5 text-[11px] leading-relaxed text-muted">
                      {item.description}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <section className="min-w-0 rounded-box border border-hairline bg-white p-4 shadow-sm sm:p-5">
            {!visibleDetail ? (
              <div className="p-6 text-center text-sm text-muted">Select a session to see diagnostics.</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">Session #{visibleDetail.publicId}</h3>
                    <p className="mt-1 text-sm text-body">
                      {formatSessionWhen(visibleDetail.startedAt, visibleDetail.endedAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {visibleDetail.courseTitle ?? 'Classroom'} · {visibleDetail.roomName}
                      {visibleDetail.roomKey !== 'main' ? ` · room ${visibleDetail.roomKey.toUpperCase()}` : ''}
                    </p>
                  </div>
                  <StatusMark
                    health={visibleDetail.health}
                    presence={visibleDetail.status === 'active' ? 'connected' : 'left'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Duration" value={formatDuration(visibleDetail.durationMs)} />
                  <Metric label="Teacher" value={visibleDetail.teacherName ?? 'unavailable'} />
                  <Metric label="Students" value={String(visibleDetail.studentCount)} />
                  <Metric label="Reconnects" value={String(visibleDetail.reconnects)} />
                  <Metric label="Disconnects" value={String(visibleDetail.disconnects)} />
                  <Metric label="Avg RTT" value={formatMs(visibleDetail.avgRttMs)} />
                  <Metric label="Max RTT" value={formatMs(visibleDetail.maxRttMs)} />
                  <Metric label="Avg packet loss" value={formatPct(visibleDetail.avgPacketLossPct)} />
                </div>

                <div className="grid gap-1 text-xs text-body sm:grid-cols-2">
                  <div>Server region: {visibleDetail.serverRegion ?? 'unavailable'}</div>
                  <div>Server node: {visibleDetail.serverNodeId ?? 'unavailable'}</div>
                  <div>Server version: {visibleDetail.serverVersion ?? 'unavailable'}</div>
                  <div>
                    LiveKit room:{' '}
                    {visibleDetail.serverSnapshot
                      ? visibleDetail.serverSnapshot.roomExists
                        ? `listed, ${visibleDetail.serverSnapshot.participantCount ?? visibleDetail.serverSnapshot.participants.length} participants`
                        : 'not listed'
                      : 'snapshot unavailable'}
                  </div>
                </div>

                {visibleDetail.simultaneousNote ? (
                  <div className="rounded-box bg-amber-50 p-3 text-sm text-amber-900">
                    {visibleDetail.simultaneousNote}
                  </div>
                ) : null}

                {visibleDetail.signals.length > 0 ? (
                  <ul className="space-y-1 text-sm text-body">
                    {visibleDetail.signals.map((signal) => (
                      <li key={signal}>{signal}</li>
                    ))}
                  </ul>
                ) : null}

                <div>
                  <h4 className="text-sm font-semibold text-ink">Participants</h4>
                  <div className="mt-3 grid gap-3">
                    {people.length > 0 ? (
                      people.map((person) => <ParticipantCard key={person.id} person={person} />)
                    ) : (
                      <div className="rounded-box border border-dashed border-hairline p-4 text-sm text-muted">
                        No participant reports yet.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-ink">Timeline</h4>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="text-xs text-muted">
                      Participant
                      <select
                        value={focus}
                        onChange={(event) => setFocusIdentity(event.target.value)}
                        className="mt-1 block rounded-box border border-hairline bg-white px-2 py-1.5 text-sm text-ink">
                        <option value="all">All participants</option>
                        {people.map((person) => (
                          <option key={person.identity} value={person.identity}>
                            {roleLabel(person.role)} · {person.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-muted">
                      Around
                      <input
                        type="time"
                        step={60}
                        value={around}
                        onChange={(event) => setAround(event.target.value)}
                        className="mt-1 block rounded-box border border-hairline bg-white px-2 py-1.5 text-sm text-ink"
                      />
                    </label>
                    {around ? (
                      <button
                        type="button"
                        onClick={() => setAround('')}
                        className="rounded-box border border-hairline px-3 py-1.5 text-sm text-ink">
                        Clear time
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Enter the time someone reported, for example 11:19. The list shows the 3 minutes before and after
                    on the server clock and on that participant’s phone clock when the clocks differ.
                  </p>
                  <ol className="mt-3 max-h-[36rem] space-y-2 overflow-auto">
                    {timeline.length > 0 ? (
                      timeline.map((row) =>
                        row.kind === 'event' ? (
                          <EventRow key={row.key} event={row.event} />
                        ) : (
                          <SampleRow key={row.key} sample={row.sample} name={row.name} />
                        ),
                      )
                    ) : (
                      <li className="rounded-box border border-dashed border-hairline p-4 text-sm text-muted">
                        {around
                          ? 'No diagnostics were stored in this window.'
                          : 'No connection events recorded.'}
                      </li>
                    )}
                  </ol>
                </div>

                <div className="rounded-box bg-slate-50 p-3 text-xs leading-5 text-muted">
                  {LIMITATIONS.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
