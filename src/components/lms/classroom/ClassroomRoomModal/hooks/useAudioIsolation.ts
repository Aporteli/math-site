"use client";

import { useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";

/**
 * Data topic used for the client-side audio-isolation signaling fallback.
 * Kept separate from the whiteboard data channel messages so each listener can
 * filter on `topic` instead of decoding unrelated payloads.
 */
export const AUDIO_ISOLATION_TOPIC = "audio-isolation";

export interface AudioIsolationResult {
  ok: boolean;
  isolated: boolean;
  studentIdentity: string;
  affectedParticipants: number;
  failures: string[];
}

/**
 * Client-side helper for the targeted audio isolation (Breakout/Private) mode.
 *
 * 1. Calls the authoritative server route (`updateSubscriptions`).
 * 2. Broadcasts a lightweight data message so every connected client can also
 *    apply the change locally right away (see `AudioIsolationListener`).
 */
export function useAudioIsolation(courseId: string) {
  const room = useRoomContext();

  const setStudentIsolation = useCallback(
    async (studentIdentity: string, isolate: boolean) => {
      const res = await fetch("/api/livekit/isolation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentIdentity, isolate }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Audio isolation request failed");
      }

      // Best-effort real-time broadcast. The server update is authoritative, so a
      // failure here must not fail the operation.
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ studentIdentity, isolate }),
        );
        await room?.localParticipant.publishData(payload as any, {
          topic: AUDIO_ISOLATION_TOPIC,
          reliable: true,
        });
      } catch (error) {
        console.warn("Audio isolation broadcast skipped:", error);
      }

      return (await res.json()) as AudioIsolationResult;
    },
    [courseId, room],
  );

  return { setStudentIsolation };
}
