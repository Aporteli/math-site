"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTracks } from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { GalleryLayout } from "./GalleryLayout";
import { SpotlightLayout } from "./SpotlightLayout";
import { trackKey } from "./track-key";

export function MyVideoGrid() {
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const tracks = useMemo(() => rawTracks.filter((ref) => ref.participant?.sid), [rawTracks]);

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