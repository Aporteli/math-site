"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

export function ConnectionStatusBadge() {
  const state = useConnectionState();

  if (state === ConnectionState.Connected) {
    return (
      <div className="flex items-center gap-1.5 rounded-box border border-win/20 bg-win-tint px-2.5 py-1 text-xs font-bold text-win">
        <span className="size-2 animate-pulse rounded-box bg-win" />
      </div>
    );
  }

  if (
    state === ConnectionState.Connecting ||
    state === ConnectionState.Reconnecting
  ) {
    return (
      <div className="flex items-center gap-1.5 rounded-box border border-brass/20 bg-brass-tint px-2.5 py-1 text-xs font-bold text-brass-strong">
        <span className="size-2 animate-ping rounded-box bg-brass" />
        <span>კავშირი მყარდება...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-box border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-500">
      <span className="size-2 rounded-box bg-rose-500" />
      <span>გათიშულია</span>
    </div>
  );
}