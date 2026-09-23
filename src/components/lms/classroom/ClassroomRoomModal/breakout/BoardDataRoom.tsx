'use client';

import { useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import type { RemoteTrackPublication, Room as LiveKitRoom } from 'livekit-client';
import { BREAKOUT_TOPIC } from '@/lib/livekit/breakout';
import { useBreakout } from './BreakoutContext';

interface BoardDataRoomProps {
  token: string;
  onRoom: (room: LiveKitRoom) => void;
}

/**
 * Stays in the main room for whiteboard data while media moves to a breakout
 * room. autoSubscribe is off so this connection does not play that room's audio.
 */
export function BoardDataRoom({ token, onRoom }: BoardDataRoomProps) {
  const { requestSync } = useBreakout();

  useEffect(() => {
    const room = new Room();
    let cancelled = false;

    const onData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic !== BREAKOUT_TOPIC) return;
      try {
        const message = JSON.parse(new TextDecoder().decode(payload)) as { type?: string };
        if (message.type !== 'BREAKOUT_SYNC') return;
      } catch {
        return;
      }
      void requestSync();
    };

    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication) => {
      if (publication.kind === Track.Kind.Audio || publication.kind === Track.Kind.Video) {
        void publication.setSubscribed(false);
      }
    });

    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (url) {
      void room.connect(url, token, { autoSubscribe: false }).then(() => {
        if (!cancelled) onRoom(room);
      });
    }

    return () => {
      cancelled = true;
      room.disconnect();
    };
  }, [onRoom, requestSync, token]);

  return null;
}
