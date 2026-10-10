import type { RemoteParticipant } from 'livekit-client';
import type { DiagnosticsSession } from './session';

export function createSubscribeFailedHandler(
  session: DiagnosticsSession,
): (trackSid: string, participant: RemoteParticipant, reason?: unknown) => void {
  return (trackSid: string, _participant: RemoteParticipant, reason?: unknown) => {
    const code = typeof reason === 'string' || typeof reason === 'number' ? String(reason).slice(0, 80) : null;
    session.push('livekit_error', { message: 'Track subscription failed', trackSid, reason: code });
    session.requestFlush();
  };
}
