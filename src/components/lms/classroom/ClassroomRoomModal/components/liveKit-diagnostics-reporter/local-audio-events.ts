import { Track, type TrackPublication } from 'livekit-client';
import type { DiagnosticsSession } from './session';

export function createLocalAudioHandlers(session: DiagnosticsSession): {
  onLocalPublished: (publication: TrackPublication) => void;
  onLocalUnpublished: (publication: TrackPublication) => void;
} {
  const onLocalPublished = (publication: TrackPublication) => {
    if (publication.source !== Track.Source.Microphone) return;
    session.push('audio_published', { audioTrackState: publication.isMuted ? 'muted' : 'published' });
  };
  const onLocalUnpublished = (publication: TrackPublication) => {
    if (publication.source !== Track.Source.Microphone) return;
    session.push('audio_unpublished', { audioTrackState: 'unpublished' });
  };
  return { onLocalPublished, onLocalUnpublished };
}
