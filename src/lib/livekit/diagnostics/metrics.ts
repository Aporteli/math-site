export interface StatsEntry {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface StatsReportLike {
  forEach: (callback: (stat: StatsEntry) => void) => void;
}

export interface MetricCounters {
  atMs: number;
  sendAudioBytes: number | null;
  receiveAudioBytes: number | null;
  inboundPacketsReceived: number | null;
  inboundPacketsLost: number | null;
}

export interface ConnectionMetrics {
  rttMs: number | null;
  sendLossPct: number | null;
  receiveLossPct: number | null;
  jitterMs: number | null;
  sendBitrateKbps: number | null;
  receiveBitrateKbps: number | null;
  iceState: string | null;
  dtlsState: string | null;
  candidateRoute: string | null;
  reportedNetworkType: string | null;
}

export interface ParsedConnection {
  metrics: ConnectionMetrics;
  counters: MetricCounters;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function secondsToMs(value: number | null): number | null {
  if (value === null || value < 0) return null;
  if (value <= 10) return value * 1000;
  return value;
}

function intervalLoss(
  previousLost: number | null,
  nextLost: number | null,
  previousReceived: number | null,
  nextReceived: number | null,
): number | null {
  if (previousLost === null || nextLost === null || previousReceived === null || nextReceived === null) {
    return null;
  }
  const lostDelta = nextLost - previousLost;
  const receivedDelta = nextReceived - previousReceived;
  if (lostDelta < 0 || receivedDelta < 0) return null;
  const total = lostDelta + receivedDelta;
  if (total <= 0) return null;
  return (lostDelta / total) * 100;
}

function bitrateKbps(
  previousBytes: number | null,
  nextBytes: number | null,
  previousMs: number,
  nowMs: number,
): number | null {
  if (previousBytes === null || nextBytes === null) return null;
  const deltaBytes = nextBytes - previousBytes;
  const deltaSec = (nowMs - previousMs) / 1000;
  if (deltaBytes < 0 || deltaSec < 1) return null;
  return (deltaBytes * 8) / deltaSec / 1000;
}

function fractionToPct(value: number | null): number | null {
  if (value === null || value < 0) return null;
  if (value <= 1) return value * 100;
  if (value <= 100) return value;
  return null;
}

export function parseConnectionMetrics(
  reports: ReadonlyArray<StatsReportLike>,
  previous: MetricCounters | null,
  nowMs: number,
): ParsedConnection {
  const byId = new Map<string, StatsEntry>();
  const candidatePairs: StatsEntry[] = [];
  let transport: StatsEntry | undefined;
  let sendAudioBytes = 0;
  let sawSendAudio = false;
  let receiveAudioBytes = 0;
  let sawReceiveAudio = false;
  let inboundReceived = 0;
  let inboundLost = 0;
  let sawInbound = false;
  let maxJitterMs: number | null = null;
  let maxSendLossPct: number | null = null;

  for (const report of reports) {
    report.forEach((stat) => {
      if (typeof stat.id === 'string') byId.set(stat.id, stat);
    });
  }

  for (const stat of byId.values()) {
    if (stat.type === 'transport' && !transport) transport = stat;
    if (stat.type === 'candidate-pair') candidatePairs.push(stat);
    if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
      const bytes = num(stat.bytesSent);
      if (bytes !== null) {
        sendAudioBytes += bytes;
        sawSendAudio = true;
      }
      const remoteId = text(stat.remoteId);
      const remote = remoteId ? byId.get(remoteId) : undefined;
      const fraction = fractionToPct(num(remote?.fractionLost));
      if (fraction !== null) maxSendLossPct = maxSendLossPct === null ? fraction : Math.max(maxSendLossPct, fraction);
    }
    if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
      const bytes = num(stat.bytesReceived);
      if (bytes !== null) {
        receiveAudioBytes += bytes;
        sawReceiveAudio = true;
      }
      const received = num(stat.packetsReceived);
      const lost = num(stat.packetsLost);
      if (received !== null && lost !== null) {
        inboundReceived += received;
        inboundLost += lost;
        sawInbound = true;
      }
      const jitter = secondsToMs(num(stat.jitter));
      if (jitter !== null) maxJitterMs = maxJitterMs === null ? jitter : Math.max(maxJitterMs, jitter);
    }
  }

  const selectedPairId = text(transport?.selectedCandidatePairId);
  const pair =
    (selectedPairId ? byId.get(selectedPairId) : undefined) ??
    candidatePairs.find((candidate) => candidate.selected === true || candidate.nominated === true);
  const localId = text(pair?.localCandidateId);
  const remoteCandidateId = text(pair?.remoteCandidateId);
  const local = localId ? byId.get(localId) : undefined;
  const remote = remoteCandidateId ? byId.get(remoteCandidateId) : undefined;
  const localType = text(local?.candidateType);
  const remoteType = text(remote?.candidateType);
  const protocol = text(local?.protocol);
  const route = localType && remoteType ? `${localType}/${protocol ?? 'unknown'} -> ${remoteType}` : null;

  const counters: MetricCounters = {
    atMs: nowMs,
    sendAudioBytes: sawSendAudio ? sendAudioBytes : null,
    receiveAudioBytes: sawReceiveAudio ? receiveAudioBytes : null,
    inboundPacketsReceived: sawInbound ? inboundReceived : null,
    inboundPacketsLost: sawInbound ? inboundLost : null,
  };

  return {
    counters,
    metrics: {
      rttMs: secondsToMs(num(pair?.currentRoundTripTime)),
      sendLossPct: maxSendLossPct,
      receiveLossPct: intervalLoss(
        previous?.inboundPacketsLost ?? null,
        counters.inboundPacketsLost,
        previous?.inboundPacketsReceived ?? null,
        counters.inboundPacketsReceived,
      ),
      jitterMs: maxJitterMs,
      sendBitrateKbps: bitrateKbps(previous?.sendAudioBytes ?? null, counters.sendAudioBytes, previous?.atMs ?? nowMs, nowMs),
      receiveBitrateKbps: bitrateKbps(
        previous?.receiveAudioBytes ?? null,
        counters.receiveAudioBytes,
        previous?.atMs ?? nowMs,
        nowMs,
      ),
      iceState: text(transport?.iceState),
      dtlsState: text(transport?.dtlsState),
      candidateRoute: route,
      reportedNetworkType: text(local?.networkType),
    },
  };
}
