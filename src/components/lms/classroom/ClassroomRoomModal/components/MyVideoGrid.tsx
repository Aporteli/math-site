"use client";

import { useMemo } from "react";
import { GridLayout, ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export function MyVideoGrid() {
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const tracks = useMemo(() => {
    return rawTracks.filter((trackRef) =>
      Boolean(trackRef.participant && trackRef.participant.sid),
    );
  }, [rawTracks]);

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden p-1.5">
      <GridLayout tracks={tracks} className="h-full w-full">
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}