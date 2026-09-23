import type { Room } from 'livekit-client';
import { RemoteAudioTrack } from 'livekit-client';
import { participantUserId } from '@/lib/livekit/participant-identity';

/** Local playback only. This never changes the sender's microphone. */
export function applyRemoteVolume(room: Room, volumeFor: (userId: string) => number) {
  for (const participant of room.remoteParticipants.values()) {
    const volume = volumeFor(participantUserId(participant));
    for (const publication of participant.audioTrackPublications.values()) {
      const track = publication.audioTrack;
      if (track instanceof RemoteAudioTrack) track.setVolume(volume);
    }
  }
}
