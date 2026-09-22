//CUT 

"use client";

import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import type { DataPacket_Kind, RemoteParticipant, Room } from "livekit-client";
import { participantUserId } from "@/lib/livekit/participant-identity";
import { AUDIO_ISOLATION_TOPIC } from "../hooks/useAudioIsolation";

interface AudioIsolationListenerProps {
  isTeacher: boolean;
}

export function AudioIsolationListener({ isTeacher }: AudioIsolationListenerProps) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room || isTeacher) return;

    const handleData = (
      payload: Uint8Array,
      _participant: RemoteParticipant | undefined,
      _kind: DataPacket_Kind | undefined,
      topic: string | undefined,
    ) => {
      if (topic !== AUDIO_ISOLATION_TOPIC) return;

      let message: { isolatedIdentities?: unknown };
      try {
        message = JSON.parse(new TextDecoder().decode(payload)) as {
          isolatedIdentities?: unknown;
        };
      } catch {
        return;
      }

      if (!Array.isArray(message.isolatedIdentities) ||
          !message.isolatedIdentities.every((id) => typeof id === "string")) {
        return;
      }

      applyIsolationLocally(room, message.isolatedIdentities as string[]);
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, isTeacher]);

  return null;
}

function applyIsolationLocally(room: Room, isolatedIdentities: string[]) {
  const isolatedSet = new Set(isolatedIdentities);
  const localIsolated = isolatedSet.has(room.localParticipant.identity);
  const myUserId = participantUserId(room.localParticipant);

  // The local client (never the teacher, since the listener is disabled for
  // the teacher) recomputes which remote audio it should hear:
  //  - isolated locally  -> hear nobody;
  //  - otherwise          -> hear everyone except isolated students.
  for (const participant of room.remoteParticipants.values()) {
    // იგივე ექაუნთის მეორე მოწყობილობა ჩუმად რჩება (თვითგამოძახილი რომ არ იყოს).
    if (participantUserId(participant) === myUserId) continue;

    const shouldHear = !localIsolated && !isolatedSet.has(participant.identity);

    for (const publication of participant.audioTrackPublications.values()) {
      publication.setSubscribed(shouldHear);
    }
  }
}
