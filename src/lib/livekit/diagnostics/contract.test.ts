import assert from 'node:assert/strict';
import { diagnosticsReportSchema } from './contract';

const parsed = diagnosticsReportSchema.safeParse({
  courseId: 'course_123',
  roomKey: 'main',
  secondary: false,
  leaving: false,
  self: {
    identity: 'user_123:ab12cd34',
    displayName: 'Teacher',
    connectionState: 'connected',
    quality: 'excellent',
    rttMs: 42,
    sendLossPct: 0.2,
    receiveLossPct: null,
    jitterMs: 4,
    audioBitrateKbps: 48,
    audioTrackState: 'published',
    micPublishing: true,
    subscribedAudioCount: 2,
    iceState: 'connected',
    iceSubscriberState: 'connected',
    dtlsState: 'connected',
    candidateRoute: 'host/udp -> host',
    reportedNetworkType: 'wifi',
    reportedRegion: null,
    reportedNodeId: null,
    serverVersion: null,
    reconnecting: false,
  },
  events: [
    {
      kind: 'network_degraded',
      occurredAt: '2026-10-02T10:42:15.000Z',
      dedupeKey: '11111111-2222-4333-8444-555555555555',
      detail: {
        rttMs: 680,
        packetLossPct: 19.4,
        jitterMs: 87,
        message: 'Connection metrics crossed a degradation threshold',
      },
    },
  ],
});

assert.equal(parsed.success, true);

console.log('livekit diagnostics contract tests passed');
