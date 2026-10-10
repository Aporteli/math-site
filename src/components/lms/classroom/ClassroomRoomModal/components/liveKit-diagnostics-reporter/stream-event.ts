import { Track, type RemoteParticipant, type RemoteTrackPublication } from 'livekit-client';
import { isAuxiliaryParticipant } from '@/lib/livekit/participant-identity';
import type { DiagnosticsSession } from './session';

export function createStreamHandler(
  session: DiagnosticsSession,
): (publication: RemoteTrackPublication, streamState: Track.StreamState, participant: RemoteParticipant) => void {
  return (publication: RemoteTrackPublication, streamState: Track.StreamState, participant: RemoteParticipant) => {
    if (publication.source !== Track.Source.Microphone || isAuxiliaryParticipant(participant)) return;
    session.push('audio_stream_changed', {
      remoteIdentity: participant.identity,
      subscriptionState: streamState,
    });
  };
}
