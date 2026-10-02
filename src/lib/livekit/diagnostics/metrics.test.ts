import assert from 'node:assert/strict';
import { parseConnectionMetrics, type StatsEntry, type StatsReportLike } from './metrics';

function report(entries: StatsEntry[]): StatsReportLike {
  return {
    forEach(callback) {
      for (const entry of entries) callback(entry);
    },
  };
}

const first = parseConnectionMetrics(
  [
    report([
      { id: 'transport', type: 'transport', iceState: 'connected', dtlsState: 'connected', selectedCandidatePairId: 'pair' },
      { id: 'pair', type: 'candidate-pair', selected: true, currentRoundTripTime: 0.042, localCandidateId: 'local', remoteCandidateId: 'remote' },
      {
        id: 'local',
        type: 'local-candidate',
        candidateType: 'host',
        protocol: 'udp',
        networkType: 'wifi',
        address: '192.168.1.20',
        port: 54000,
      },
      { id: 'remote', type: 'remote-candidate', candidateType: 'host', protocol: 'udp', address: '203.0.113.8' },
      {
        id: 'out',
        type: 'outbound-rtp',
        kind: 'audio',
        bytesSent: 1000,
        remoteId: 'remote-in',
      },
      { id: 'remote-in', type: 'remote-inbound-rtp', fractionLost: 0.002, jitter: 0.004, roundTripTime: 0.05 },
      {
        id: 'in',
        type: 'inbound-rtp',
        kind: 'audio',
        bytesReceived: 2000,
        packetsReceived: 100,
        packetsLost: 1,
        jitter: 0.004,
      },
    ]),
  ],
  null,
  1_000,
);

assert.equal(first.metrics.rttMs, 42);
assert.equal(first.metrics.sendLossPct, 0.2);
assert.equal(first.metrics.receiveLossPct, null);
assert.equal(first.metrics.jitterMs, 4);
assert.equal(first.metrics.iceState, 'connected');
assert.equal(first.metrics.candidateRoute, 'host/udp -> host');
assert.equal(first.metrics.reportedNetworkType, 'wifi');
assert.equal(JSON.stringify(first.metrics).includes('192.168'), false);
assert.equal(JSON.stringify(first.metrics).includes('203.0.113'), false);

const second = parseConnectionMetrics(
  [
    report([
      { id: 'out', type: 'outbound-rtp', kind: 'audio', bytesSent: 1000 + 6000 },
      { id: 'in', type: 'inbound-rtp', kind: 'audio', bytesReceived: 2000 + 3000, packetsReceived: 180, packetsLost: 5, jitter: 0.01 },
    ]),
  ],
  first.counters,
  2_000,
);

assert.equal(second.metrics.sendBitrateKbps, 48);
assert.equal(second.metrics.receiveBitrateKbps, 24);
assert.ok(second.metrics.receiveLossPct !== null && second.metrics.receiveLossPct > 4);
assert.equal(second.metrics.jitterMs, 10);

const empty = parseConnectionMetrics([], null, 3_000);
assert.equal(empty.metrics.rttMs, null);
assert.equal(empty.metrics.sendLossPct, null);
assert.equal(empty.metrics.jitterMs, null);
assert.equal(empty.metrics.iceState, null);

console.log('livekit diagnostics metrics tests passed');
