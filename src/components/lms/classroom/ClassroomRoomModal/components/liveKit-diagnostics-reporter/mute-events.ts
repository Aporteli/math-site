import { Track, type Participant, type TrackPublication } from 'livekit-client';
import { pushAudioSubscription } from './audio-subscription';
import type { DiagnosticsSession } from './session';

export function createMuteHandlers(session: DiagnosticsSession): {
  onMuted: (publication: TrackPublication, participant: Participant) => void;
  onUnmuted: (publication: TrackPublication, participant: Participant) => void;
} {
  const onMuted = (publication: TrackPublication, participant: Participant) => {
    if (publication.source !== Track.Source.Microphone) return;
    if (participant.identity === session.room.localParticipant.identity) {
      session.push('audio_muted', { audioTrackState: 'muted' });
      return;
    }
    if (!session.subscriptions) return;
    session.subscriptions.set(participant.identity, 'muted');
    pushAudioSubscription(session, participant.identity, 'muted');
  };
  const onUnmuted = (publication: TrackPublication, participant: Participant) => {
    if (publication.source !== Track.Source.Microphone) return;
    if (participant.identity === session.room.localParticipant.identity) {
      session.push('audio_unmuted', { audioTrackState: 'published' });
      return;
    }
    if (!session.subscriptions) return;
    session.subscriptions.set(participant.identity, 'subscribed');
    pushAudioSubscription(session, participant.identity, 'subscribed');
  };
  return { onMuted, onUnmuted };
}
