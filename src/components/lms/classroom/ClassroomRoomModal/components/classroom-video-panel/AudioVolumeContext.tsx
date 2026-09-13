
//CUT

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, RemoteAudioTrack } from 'livekit-client';
import type { RemoteParticipant } from 'livekit-client';

/** Full volume (LiveKit `setVolume` uses 0.0 = mute … 1.0 = full). */
const DEFAULT_VOLUME = 1;

interface AudioVolumeContextValue {
  /** Current per-participant volumes (0..1), keyed by participant identity. */
  volumes: Record<string, number>;
  getVolume: (identity: string) => number;
  setVolume: (identity: string, volume: number) => void;
}

const AudioVolumeContext = createContext<AudioVolumeContextValue>({
  volumes: {},
  getVolume: () => DEFAULT_VOLUME,
  setVolume: () => {},
});

function applyVolumeToParticipant(participant: RemoteParticipant, volume: number) {
  for (const publication of participant.audioTrackPublications.values()) {
    const track = publication.audioTrack;
    if (track instanceof RemoteAudioTrack) {
      track.setVolume(volume);
    }
  }
}

/**
 * Local, per-participant volume control for remote audio tracks.
 *
 * Uses LiveKit's official `RemoteAudioTrack.setVolume` so it never affects the
 * sender or any other participant. Tracks are re-synced on the relevant room
 * events (join/leave/mute/unmute/subscribe) so a custom volume survives mic
 * toggles and reconnects without leaking listeners.
 */
export function AudioVolumeProvider({ children }: { children: ReactNode }) {
  const room = useRoomContext();
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const volumesRef = useRef(volumes);
  volumesRef.current = volumes;

  const applyAllVolumes = useCallback(() => {
    if (!room) return;
    for (const participant of room.remoteParticipants.values()) {
      applyVolumeToParticipant(participant, volumesRef.current[participant.identity] ?? DEFAULT_VOLUME);
    }
  }, [room]);

  useEffect(() => {
    if (!room) return;

    applyAllVolumes();

    room.on(RoomEvent.TrackSubscribed, applyAllVolumes);
    room.on(RoomEvent.TrackUnsubscribed, applyAllVolumes);
    room.on(RoomEvent.TrackMuted, applyAllVolumes);
    room.on(RoomEvent.TrackUnmuted, applyAllVolumes);
    room.on(RoomEvent.ParticipantConnected, applyAllVolumes);

    return () => {
      room.off(RoomEvent.TrackSubscribed, applyAllVolumes);
      room.off(RoomEvent.TrackUnsubscribed, applyAllVolumes);
      room.off(RoomEvent.TrackMuted, applyAllVolumes);
      room.off(RoomEvent.TrackUnmuted, applyAllVolumes);
      room.off(RoomEvent.ParticipantConnected, applyAllVolumes);
    };
  }, [room, applyAllVolumes]);

  const setVolume = useCallback(
    (identity: string, volume: number) => {
      const clamped = Math.min(1, Math.max(0, volume));
      setVolumes((prev) => ({ ...prev, [identity]: clamped }));

      // Apply immediately (don't wait for a re-render) so the slider feels instant.
      const participant = room?.remoteParticipants.get(identity);
      if (participant) applyVolumeToParticipant(participant, clamped);
    },
    [room],
  );

  const getVolume = useCallback(
    (identity: string) => volumes[identity] ?? DEFAULT_VOLUME,
    [volumes],
  );

  const value = useMemo(
    () => ({ volumes, getVolume, setVolume }),
    [volumes, getVolume, setVolume],
  );

  return <AudioVolumeContext.Provider value={value}>{children}</AudioVolumeContext.Provider>;
}

export function useAudioVolume() {
  return useContext(AudioVolumeContext);
}
