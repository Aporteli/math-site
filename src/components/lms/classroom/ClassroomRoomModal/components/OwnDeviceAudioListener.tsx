'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import type { RemoteParticipant, RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import { participantUserId } from '@/lib/livekit/participant-identity';

/**
 * ერთი ექაუნთის მეორე კავშირის (სხვა მოწყობილობის) ხმას არ ვუსმენთ: ის თითქმის
 * ყოველთვის იმავე ოთახშია და საკუთარ თავს ორჯერ (დაგვიანებით) მოვისმენდით.
 * ტექნიკურად — მისი აუდიო ტრეკები ამ კლიენტზე არ იწერება (unsubscribe).
 */
export function OwnDeviceAudioListener() {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const myUserId = participantUserId(room.localParticipant);

    const silenceOwnDevices = () => {
      for (const participant of room.remoteParticipants.values()) {
        if (participantUserId(participant) !== myUserId) continue;

        for (const publication of participant.audioTrackPublications.values()) {
          if (publication.isSubscribed) publication.setSubscribed(false);
        }
      }
    };

    const handleTrackSubscribed = (
      _track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (publication.source !== Track.Source.Microphone) return;
      if (participantUserId(participant) !== myUserId) return;
      publication.setSubscribed(false);
    };

    silenceOwnDevices();

    room.on(RoomEvent.ParticipantConnected, silenceOwnDevices);
    room.on(RoomEvent.TrackPublished, silenceOwnDevices);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    return () => {
      room.off(RoomEvent.ParticipantConnected, silenceOwnDevices);
      room.off(RoomEvent.TrackPublished, silenceOwnDevices);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    };
  }, [room]);

  return null;
}