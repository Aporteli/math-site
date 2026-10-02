import assert from 'node:assert/strict';
import {
  classifyHistory,
  classifyLive,
  degradationTransition,
  formatDuration,
  isDegradedSample,
  sanitizeRoute,
  simultaneousProblemNote,
  type ParticipantHealthInput,
} from './model';

const now = Date.parse('2026-10-02T10:42:00.000Z');

function input(overrides: Partial<ParticipantHealthInput> = {}): ParticipantHealthInput {
  return {
    connectionState: 'connected',
    quality: 'excellent',
    reconnects: 0,
    disconnects: 0,
    rttMs: 42,
    sendLossPct: 0.2,
    receiveLossPct: 0.1,
    jitterMs: 4,
    maxRttMs: 42,
    maxSendLossPct: 0.2,
    maxReceiveLossPct: 0.1,
    maxJitterMs: 4,
    hasMeasurement: true,
    leftAt: null,
    lastSeenAt: '2026-10-02T10:41:55.000Z',
    lastDisconnectReason: null,
    reconnectingSince: null,
    nowMs: now,
    ...overrides,
  };
}

const healthy = classifyLive(input());
assert.equal(healthy.health, 'healthy');
assert.equal(healthy.presence, 'connected');
assert.equal(healthy.signals.length, 0);

const loss = classifyLive(input({ sendLossPct: 6.2, rttMs: 51 }));
assert.equal(loss.health, 'degraded');
assert.equal(loss.signals.includes('Publisher audio packet loss is elevated'), true);
assert.equal(loss.signals.some((signal) => /wi-?fi/i.test(signal)), false);

const criticalLoss = classifyLive(input({ receiveLossPct: 19.4, rttMs: 680, jitterMs: 87 }));
assert.equal(criticalLoss.health, 'critical');
assert.equal(criticalLoss.signals.includes('Incoming audio packet loss is elevated'), true);
assert.equal(criticalLoss.signals.includes('Round-trip time is elevated'), true);

const repeated = classifyLive(input({ reconnects: 3, quality: 'good' }));
assert.equal(repeated.health, 'critical');
assert.equal(repeated.signals.includes('Connection repeatedly entered reconnecting state'), true);

const once = classifyLive(input({ reconnects: 1 }));
assert.equal(once.health, 'degraded');
assert.equal(once.signals.includes('Connection entered reconnecting state'), true);

const dropped = classifyLive(
  input({
    connectionState: 'disconnected',
    quality: 'lost',
    lastDisconnectReason: 'SIGNAL_CLOSE',
    rttMs: null,
    sendLossPct: null,
    receiveLossPct: null,
    jitterMs: null,
  }),
);
assert.equal(dropped.presence, 'disconnected');
assert.equal(dropped.health, 'critical');
assert.equal(dropped.signals.includes('LiveKit disconnect reason: SIGNAL_CLOSE'), true);

const silent = classifyLive(input({ lastSeenAt: '2026-10-02T10:40:00.000Z', connectionState: 'connected' }));
assert.equal(silent.presence, 'disconnected');
assert.equal(silent.signals.includes('Client stopped reporting diagnostics'), true);

const prolonged = classifyLive(
  input({
    connectionState: 'reconnecting',
    reconnectingSince: '2026-10-02T10:41:30.000Z',
    reconnects: 1,
  }),
);
assert.equal(prolonged.health, 'critical');
assert.equal(prolonged.signals.includes('Connection remained in reconnecting state'), true);

const history = classifyHistory(
  input({
    connectionState: 'disconnected',
    leftAt: '2026-10-02T11:30:00.000Z',
    disconnects: 0,
    reconnects: 0,
    maxRttMs: 48,
    maxSendLossPct: 0.3,
  }),
);
assert.equal(history.health, 'healthy');

const kicked = classifyHistory(input({ disconnects: 1, lastDisconnectReason: 'PARTICIPANT_REMOVED', maxRttMs: 91 }));
assert.equal(kicked.health, 'critical');
assert.equal(kicked.signals.includes('Participant disconnected unexpectedly'), true);
assert.equal(kicked.signals.includes('LiveKit disconnect reason: PARTICIPANT_REMOVED'), true);

assert.equal(isDegradedSample({ quality: 'excellent', rttMs: 40, sendLossPct: 0.2, receiveLossPct: null, jitterMs: 4 }), false);
assert.equal(degradationTransition(false, { quality: 'poor', rttMs: 40, sendLossPct: null, receiveLossPct: null, jitterMs: null }), 'degraded');
assert.equal(degradationTransition(true, { quality: 'excellent', rttMs: 40, sendLossPct: 0.2, receiveLossPct: 0.2, jitterMs: 4 }), 'recovered');
assert.equal(degradationTransition(true, { quality: 'poor', rttMs: null, sendLossPct: null, receiveLossPct: null, jitterMs: null }), null);

const note = simultaneousProblemNote([
  { occurredAt: '2026-10-02T10:42:15.000Z', identity: 'teacher', kind: 'network_degraded' },
  { occurredAt: '2026-10-02T10:42:18.000Z', identity: 'student-1', kind: 'reconnecting' },
]);
assert.equal(note, 'Multiple participants recorded connection problems within 10 seconds.');
assert.equal(note?.toLowerCase().includes('wi-fi'), false);
assert.equal(
  simultaneousProblemNote([{ occurredAt: '2026-10-02T10:42:15.000Z', identity: 'teacher', kind: 'network_degraded' }]),
  null,
);

assert.equal(sanitizeRoute('host/udp -> host'), 'host/udp -> host');
assert.equal(sanitizeRoute('relay/udp -> host'), 'relay/udp -> host');
assert.equal(sanitizeRoute('192.168.1.10/udp -> host'), null);
assert.equal(sanitizeRoute('host/udp -> [2001:db8::1]'), null);
assert.equal(formatDuration(89 * 60 * 1000), '1h 29m');

console.log('livekit diagnostics model tests passed');
