//CUT


"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  TrackRefContext,
  VideoTrack,
  isTrackReference,
  useTracks,
} from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Maximize2, Minimize2, ScreenShare, User } from "lucide-react";

/** სტაბილური უნიკალური ID ტრეკისთვის */
function trackKey(ref: TrackReferenceOrPlaceholder): string {
  const participant = ref.participant;
  const id = participant?.sid ?? participant?.identity ?? "unknown";
  return `${id}:${ref.source}`;
}

interface ThumbTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  onSelect: (ref: TrackReferenceOrPlaceholder) => void;
}

/** კომპაქტური ვიდეო ბარათი */
const ThumbTile = memo(function ThumbTile({ trackRef, onSelect }: ThumbTileProps) {
  const hasVideo = isTrackReference(trackRef);
  const participant = trackRef.participant;
  const name = participant?.name || participant?.identity || "მონაწილე";
  const isScreenShare = trackRef.source === Track.Source.ScreenShare;
  const isLocal = Boolean(participant?.isLocal);

  return (
    <TrackRefContext.Provider value={trackRef}>
      <div
        onClick={() => onSelect(trackRef)}
        className="group relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 text-left transition-all duration-200 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
      >
        {hasVideo ? (
          <VideoTrack
            trackRef={trackRef}
            className="h-full w-full"
            style={{ objectFit: isScreenShare ? "contain" : "cover" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900/80">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-800 border border-white/10">
              <User className="size-5 text-white/50" />
            </div>
          </div>
        )}

        {/* Hover-ზე გაშლის იკონი */}
        <div className="absolute right-2 bottom-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex size-7 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-md">
            <Maximize2 className="size-3.5" />
          </div>
        </div>
   

        {/* სახელი და სტატუსის ბეჯი */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 ">
          {isScreenShare && <ScreenShare className="size-3 shrink-0 text-emerald-400" />}
          <span className="truncate text-xs font-medium text-white/90">
            {name}
            {isLocal ? " (შენ)" : ""}
          </span>
        </div>
      </div>
    </TrackRefContext.Provider>
  );
});

interface SpotlightTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  onMinimize: () => void;
}

/** არჩეული (დიდი) ვიდეო Spotlight რეჟიმში */
const SpotlightTile = memo(function SpotlightTile({
  trackRef,
  onMinimize,
}: SpotlightTileProps) {
  const hasVideo = isTrackReference(trackRef);
  const participant = trackRef.participant;
  const name = participant?.name || participant?.identity || "მონაწილე";
  const isScreenShare = trackRef.source === Track.Source.ScreenShare;

  return (
    <TrackRefContext.Provider value={trackRef}>
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-emerald-500/30 bg-slate-950">
        {hasVideo ? (
          <VideoTrack
            trackRef={trackRef}
            className="h-full w-full"
            style={{ objectFit: isScreenShare ? "contain" : "cover" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900">
            <div className="flex size-16 items-center justify-center rounded-full bg-slate-800 border border-white/10">
              <User className="size-8 text-white/40" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onMinimize}
          title="მინიმიზაცია"
          className="absolute right-2 bottom-2 z-10 flex size-7 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-md transition hover:bg-black/90"
        >
          <Minimize2 className="size-3.5" />
        </button>
   

        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1 backdrop-blur-md">
          {isScreenShare && <ScreenShare className="size-3.5 text-emerald-400" />}
          <span className="truncate text-xs font-semibold text-white">{name}</span>
        </div>
      </div>
    </TrackRefContext.Provider>
  );
});

export function MyVideoGrid() {
  const rawTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const tracks = useMemo(
    () => rawTracks.filter((ref) => Boolean(ref.participant && ref.participant.sid)),
    [rawTracks],
  );

  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const focusedTrack = useMemo(
    () => (focusedKey ? tracks.find((ref) => trackKey(ref) === focusedKey) ?? null : null),
    [focusedKey, tracks],
  );

  const otherTracks = useMemo(
    () =>
      focusedTrack
        ? tracks.filter((ref) => trackKey(ref) !== trackKey(focusedTrack))
        : tracks,
    [tracks, focusedTrack],
  );

  useEffect(() => {
    if (focusedKey && !focusedTrack) {
      setFocusedKey(null);
    }
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

  /* 1. SPOTLIGHT MODE (როცა რომელიმე ვიდეო დიდია) */
  if (focusedTrack) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col gap-2 p-2 overflow-hidden">
        {/* მთავარი დიდი ვიდეო */}
        <div className="relative min-h-0 flex-1 w-full">
          <SpotlightTile trackRef={focusedTrack} onMinimize={handleMinimize} />
        </div>

        {/* დანარჩენი პატარა ვიდეოების ჰორიზონტალური ზოლი */}
        {otherTracks.length > 0 && (
          <div className="flex h-24 shrink-0 gap-2 overflow-x-auto pb-1">
            {otherTracks.map((ref) => (
              <div key={trackKey(ref)} className="h-full w-32 shrink-0">
                <ThumbTile trackRef={ref} onSelect={handleSelect} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* 2. GALLERY MODE (ნორმალური ვერტიკალური განლაგება ვიწრო პანელში) */
  return (
    <div className="h-full w-full min-h-0 overflow-y-auto p-2">
      <div className="flex flex-col gap-2">
        {tracks.map((ref) => (
          <div key={trackKey(ref)} className="aspect-video w-full shrink-0">
            <ThumbTile trackRef={ref} onSelect={handleSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}