import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";

export function trackKey(ref: TrackReferenceOrPlaceholder): string {
  const p = ref.participant;
  return `${p?.sid ?? p?.identity ?? "unknown"}:${ref.source}`;
}