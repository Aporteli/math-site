import { type DisconnectReason } from 'livekit-client';
import { VOLUNTARY } from './constants';
import { reasonName } from './format';
import type { DiagnosticsSession } from './session';

export function createDisconnectedHandler(session: DiagnosticsSession): (reason?: DisconnectReason) => void {
  return (reason?: DisconnectReason) => {
    const name = reasonName(reason);
    if (reason !== undefined && VOLUNTARY.has(reason)) {
      session.push('participant_left', { reason: name, message: 'Participant left the room' });
      return;
    }
    session.push('disconnected', { reason: name, message: 'Participant disconnected' });
    session.requestFlush();
  };
}
