"use client";

import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import type { DataPacket_Kind, RemoteParticipant, Room } from "livekit-client";
import { AUDIO_ISOLATION_TOPIC } from "../hooks/useAudioIsolation";

interface AudioIsolationListenerProps {
  isTeacher: boolean;
}

/**
 * Listens for audio-isolation data messages and applies the change locally.
 *
 * This is the client-side fallback described in the task:
 *  - the isolated student unsubscribes from every remote audio track;
 *  - every other student unsubscribes specifically from the isolated student's
 *    audio track;
 *  - the teacher's subscriptions are left untouched (listener is disabled for
 *    the teacher).
 */
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

      let message: { studentIdentity?: unknown; isolate?: unknown };
      try {
        message = JSON.parse(new TextDecoder().decode(payload)) as {
          studentIdentity?: unknown;
          isolate?: unknown;
        };
      } catch {
        return;
      }

      if (typeof message.studentIdentity !== "string" || typeof message.isolate !== "boolean") {
        return;
      }

      applyIsolationLocally(room, message.studentIdentity, message.isolate);
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, isTeacher]);

  return null;
}

function applyIsolationLocally(room: Room, studentIdentity: string, isolate: boolean) {
  const localIdentity = room.localParticipant.identity;

  if (localIdentity === studentIdentity) {
    // Isolated student: mute/unmute everyone else's audio locally.
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.audioTrackPublications.values()) {
        publication.setSubscribed(!isolate);
      }
    }
    return;
  }

  // Other student: mute/unmute only the isolated student's audio locally.
  const isolatedParticipant = room.remoteParticipants.get(studentIdentity);
  if (!isolatedParticipant) return;

  for (const publication of isolatedParticipant.audioTrackPublications.values()) {
    publication.setSubscribed(!isolate);
  }
}
