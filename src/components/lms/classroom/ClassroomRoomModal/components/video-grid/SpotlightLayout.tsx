"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Tile } from "./Tile";
import { trackKey } from "./track-key";

interface SpotlightLayoutProps {
  focusedTrack: TrackReferenceOrPlaceholder;
  otherTracks: TrackReferenceOrPlaceholder[];
  onSelect: (ref: TrackReferenceOrPlaceholder) => void;
  onMinimize: () => void;
}

export function SpotlightLayout({
  focusedTrack,
  otherTracks,
  onSelect,
  onMinimize,
}: SpotlightLayoutProps) {
  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-2 overflow-hidden p-2">
      <div className="relative min-h-0 w-full flex-1">
        <Tile trackRef={focusedTrack} spotlight onMinimize={onMinimize} />
      </div>
      {otherTracks.length > 0 && (
        <div className="flex h-24 shrink-0 gap-2 overflow-x-auto pb-1">
          {otherTracks.map((ref) => (
            <div key={trackKey(ref)} className="h-full w-32 shrink-0">
              <Tile trackRef={ref} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}