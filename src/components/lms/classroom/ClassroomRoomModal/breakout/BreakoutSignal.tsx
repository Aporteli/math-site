'use client';

import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { BREAKOUT_TOPIC } from '@/lib/livekit/breakout';
import { useBreakout } from './BreakoutContext';

export function BreakoutSignal() {
  const room = useRoomContext();
  const { requestSync } = useBreakout();

  useEffect(() => {
    const handleData = (
      payload: Uint8Array,
      _participant: unknown,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== BREAKOUT_TOPIC) return;
      try {
        const message = JSON.parse(new TextDecoder().decode(payload)) as { type?: string };
        if (message.type !== 'BREAKOUT_SYNC') return;
      } catch {
        return;
      }
      void requestSync();
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [requestSync, room]);

  return null;
}
