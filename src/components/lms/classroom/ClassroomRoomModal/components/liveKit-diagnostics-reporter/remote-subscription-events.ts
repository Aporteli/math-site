import { Track, type RemoteParticipant, type RemoteTrackPublication } from 'livekit-client';
import { isAuxiliaryParticipant } from '@/lib/livekit/participant-identity';
import { pushAudioSubscription } from './audio-subscription';
import type { DiagnosticsSession } from './session';

export function createRemoteSubscriptionHandlers(session: DiagnosticsSession): {
  onSubscribed: (track: unknown, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onUnsubscribed: (track: unknown, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
} {
  const onSubscribed = (_track: unknown, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    if (!session.subscriptions || isAuxiliaryParticipant(participant) || publication.source !== Track.Source.Microphone) return;
    if (session.subscriptions.has(participant.identity)) return;
    session.subscriptions.set(participant.identity, publication.isMuted ? 'muted' : 'subscribed');
    pushAudioSubscription(session, participant.identity, publication.isMuted ? 'muted' : 'subscribed');
  };
  const onUnsubscribed = (_track: unknown, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    if (!session.subscriptions || isAuxiliaryParticipant(participant) || publication.source !== Track.Source.Microphone) return;
    if (!session.subscriptions.has(participant.identity)) return;
    session.subscriptions.delete(participant.identity);
    pushAudioSubscription(session, participant.identity, 'unsubscribed');
  };
  return { onSubscribed, onUnsubscribed };
}
