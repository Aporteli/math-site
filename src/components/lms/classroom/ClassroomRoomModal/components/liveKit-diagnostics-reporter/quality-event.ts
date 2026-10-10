import type { Participant } from 'livekit-client';
import type { DiagnosticsSession } from './session';

export function createQualityHandler(session: DiagnosticsSession): (quality: string, participant: Participant) => void {
  return (quality: string, participant: Participant) => {
    if (participant.identity !== session.room.localParticipant.identity) return;
    if (!session.sawQuality) {
      session.sawQuality = true;
      session.previousQuality = quality;
      if (quality === 'poor' || quality === 'lost') {
        session.push('quality_changed', { quality, previousQuality: null });
        session.requestFlush();
      }
      return;
    }
    if (quality === session.previousQuality) return;
    const before = session.previousQuality;
    session.previousQuality = quality;
    if (quality === 'poor' || quality === 'lost' || before === 'poor' || before === 'lost') {
      session.push('quality_changed', { quality, previousQuality: before });
      session.requestFlush();
    }
  };
}
