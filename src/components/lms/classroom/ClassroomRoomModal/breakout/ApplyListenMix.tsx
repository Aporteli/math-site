'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { applyRemoteVolume } from './apply-remote-volume';
import { useBreakout } from './BreakoutContext';

/** Teacher-only. Changes what this browser plays, not anyone else's mix. */
export function ApplyListenMix() {
  const room = useRoomContext();
  const { heardVolume, roomKey } = useBreakout();

  useEffect(() => {
    const apply = () => applyRemoteVolume(room, (userId) => heardVolume(userId, roomKey));
    apply();
    room.on(RoomEvent.TrackSubscribed, apply);
    room.on(RoomEvent.TrackUnmuted, apply);
    room.on(RoomEvent.ParticipantConnected, apply);
    return () => {
      room.off(RoomEvent.TrackSubscribed, apply);
      room.off(RoomEvent.TrackUnmuted, apply);
      room.off(RoomEvent.ParticipantConnected, apply);
    };
  }, [heardVolume, room, roomKey]);

  return null;
}
