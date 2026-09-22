"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isTrackReference, useTracks } from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { participantUserId } from "@/lib/livekit/participant-identity";
import { GalleryLayout } from "./GalleryLayout";
import { SpotlightLayout } from "./SpotlightLayout";
import { trackKey } from "./track-key";

function isCameraLive(ref: TrackReferenceOrPlaceholder): boolean {
  return isTrackReference(ref) && !ref.publication.isMuted;
}

/**
 * ერთი ექაუნთის რამდენიმე მოწყობილობიდან ბადეში ერთი კამერა ჩანს.
 * ჩართული კამერებიდან იმარჯვებს ყველაზე გვიან შემოსული — ასე ტელეფონის
 * კამერის ჩართვა სურათს იქ გადაიტანს, გამორთვა კი პირველ მოწყობილობას დაუბრუნებს.
 * თუ კამერა არსადაა ჩართული, რჩება პირველი მოწყობილობის ადგილი.
 */
function isBetterCameraRef(
  candidate: TrackReferenceOrPlaceholder,
  current: TrackReferenceOrPlaceholder,
): boolean {
  const candidateLive = isCameraLive(candidate);
  const currentLive = isCameraLive(current);
  if (candidateLive !== currentLive) return candidateLive;

  const candidateJoined = candidate.participant.joinedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const currentJoined = current.participant.joinedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

  if (candidateJoined !== currentJoined) {
    return candidateLive ? candidateJoined > currentJoined : candidateJoined < currentJoined;
  }

  return candidate.participant.sid < current.participant.sid;
}

export function MyVideoGrid() {
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const tracks = useMemo(() => {
    const cameraByUser = new Map<string, TrackReferenceOrPlaceholder>();
    const sharedTracks: TrackReferenceOrPlaceholder[] = [];

    for (const ref of rawTracks) {
      const participant = ref.participant;
      if (!participant?.sid) continue;

      // ეკრანის ჩვენება შინაარსია — ყოველთვის ჩანს.
      if (ref.source !== Track.Source.Camera) {
        sharedTracks.push(ref);
        continue;
      }

      const userId = participantUserId(participant);
      const current = cameraByUser.get(userId);
      if (!current || isBetterCameraRef(ref, current)) {
        cameraByUser.set(userId, ref);
      }
    }

    return [...cameraByUser.values(), ...sharedTracks];
  }, [rawTracks]);

  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const focusedTrack = useMemo(
    () => (focusedKey ? tracks.find((ref) => trackKey(ref) === focusedKey) ?? null : null),
    [focusedKey, tracks],
  );

  const otherTracks = useMemo(
    () => (focusedTrack ? tracks.filter((ref) => trackKey(ref) !== focusedKey) : tracks),
    [tracks, focusedTrack, focusedKey],
  );

  useEffect(() => {
    if (focusedKey && !focusedTrack) setFocusedKey(null);
  }, [focusedKey, focusedTrack]);

  const handleSelect = useCallback((ref: TrackReferenceOrPlaceholder) => {
    const key = trackKey(ref);
    setFocusedKey((prev) => (prev === key ? null : key));
  }, []);

  const handleMinimize = useCallback(() => setFocusedKey(null), []);

  if (tracks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-xs text-white/40">
        მონაწილეები არ არიან
      </div>
    );
  }

  if (focusedTrack) {
    return (
      <SpotlightLayout
        focusedTrack={focusedTrack}
        otherTracks={otherTracks}
        onSelect={handleSelect}
        onMinimize={handleMinimize}
      />
    );
  }

  return <GalleryLayout tracks={tracks} onSelect={handleSelect} />;
}