import { Track, type Room } from 'livekit-client';
import { isAuxiliaryParticipant } from '@/lib/livekit/participant-identity';

export function localMicrophone(room: Room): { publishing: boolean; state: 'published' | 'muted' | 'unpublished' } {
  for (const publication of room.localParticipant.audioTrackPublications.values()) {
    if (publication.source !== Track.Source.Microphone) continue;
    return { publishing: true, state: publication.isMuted ? 'muted' : 'published' };
  }
  return { publishing: false, state: 'unpublished' };
}

export function subscribedMicrophones(room: Room): Map<string, 'subscribed' | 'muted'> {
  const states = new Map<string, 'subscribed' | 'muted'>();
  for (const participant of room.remoteParticipants.values()) {
    if (isAuxiliaryParticipant(participant)) continue;
    for (const publication of participant.audioTrackPublications.values()) {
      if (publication.source !== Track.Source.Microphone || !publication.isSubscribed) continue;
      states.set(participant.identity, publication.isMuted ? 'muted' : 'subscribed');
    }
  }
  return states;
}
