"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Tile } from "./Tile";
import { trackKey } from "./track-key";

interface GalleryLayoutProps {
  tracks: TrackReferenceOrPlaceholder[];
  onSelect: (ref: TrackReferenceOrPlaceholder) => void;
  expanded?: boolean;
}

function galleryGrid(count: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}
export function GalleryLayout({ tracks, onSelect, expanded = false }: GalleryLayoutProps) {
  const { cols, rows } = galleryGrid(tracks.length);
  return (
    <div className={`h-full w-full min-h-0 p-2 ${expanded ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      <div
        className={expanded ? 'grid h-full w-full min-h-0 gap-2' : 'flex flex-col gap-2'}
        style={
          expanded
            ? {
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              }
            : undefined
        }>

        {tracks.map((ref) => (
          <div
          key={trackKey(ref)}
          className={expanded ? 'min-h-0 min-w-0 overflow-hidden' : 'aspect-video w-full shrink-0'}>
          <Tile trackRef={ref} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}