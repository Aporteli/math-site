import type { DiagnosticEventInput } from '@/lib/livekit/diagnostics/contract';
import { browserVisibility } from './browser';
import type { DiagnosticsSession } from './session';

export function bindPush(session: DiagnosticsSession): void {
  session.push = (kind: DiagnosticEventInput['kind'], detail: DiagnosticEventInput['detail']) => {
    session.pending.push({
      kind,
      occurredAt: new Date().toISOString(),
      dedupeKey: crypto.randomUUID(),
      detail: {
        rttMs: session.latest?.rttMs ?? null,
        packetLossPct: session.latest?.sendLossPct ?? null,
        receiveLossPct: session.latest?.receiveLossPct ?? null,
        jitterMs: session.latest?.jitterMs ?? null,
        bitrateKbps: session.latest?.sendBitrateKbps ?? session.latest?.receiveBitrateKbps ?? null,
        quality: session.room.localParticipant.connectionQuality,
        ice: session.lastIce.publisher,
        subscriberIce: session.lastIce.subscriber,
        pc: session.lastPc.publisher,
        subscriberPc: session.lastPc.subscriber,
        online: navigator.onLine,
        visibility: browserVisibility(),
        ...detail,
      },
    });
    if (session.pending.length > 25) session.pending.splice(0, session.pending.length - 25);
  };
}
