interface DiagnosticLogFields {
  event: string;
  room: string;
  participant: string;
  timestamp?: string;
  rttMs?: number | null;
  packetLossPct?: number | null;
  jitterMs?: number | null;
}

export function logLiveKitDiagnostic(fields: DiagnosticLogFields): void {
  const payload: Record<string, string | number | null> = {
    scope: 'livekit-diagnostics',
    event: fields.event,
    room: fields.room,
    participant: fields.participant,
    timestamp: fields.timestamp ?? new Date().toISOString(),
  };
  if (fields.rttMs !== undefined) payload.rttMs = fields.rttMs;
  if (fields.packetLossPct !== undefined) payload.packetLossPct = fields.packetLossPct;
  if (fields.jitterMs !== undefined) payload.jitterMs = fields.jitterMs;
  console.info(JSON.stringify(payload));
}
