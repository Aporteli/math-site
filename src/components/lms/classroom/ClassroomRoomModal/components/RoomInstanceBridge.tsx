"use client";

import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import type { Room } from "livekit-client";

export function RoomInstanceBridge({ onRoom }: { onRoom: (room: Room) => void }) {
  const room = useRoomContext();
  useEffect(() => {
    if (room) {
      onRoom(room);
    }
  }, [room, onRoom]);
  return null;
}