"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Tile } from "./Tile";
import { trackKey } from "./track-key";

interface GalleryLayoutProps {
  tracks: TrackReferenceOrPlaceholder[];
  onSelect: (ref: TrackReferenceOrPlaceholder) => void;
}

export function GalleryLayout({ tracks, onSelect }: GalleryLayoutProps) {
  return (
    <div className="h-full w-full min-h-0 overflow-y-auto p-2">
      <div className="flex flex-col gap-2">
        {tracks.map((ref) => (
          <div key={trackKey(ref)} className="aspect-video w-full shrink-0">
            <Tile trackRef={ref} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}