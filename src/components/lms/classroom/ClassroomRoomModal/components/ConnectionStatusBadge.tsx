"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

export function ConnectionStatusBadge() {
  const state = useConnectionState();

  if (state === ConnectionState.Connected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    );
  }

  if (
    state === ConnectionState.Connecting ||
    state === ConnectionState.Reconnecting
  ) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
        <span className="size-2 rounded-full bg-amber-500 animate-ping" />
        <span>კავშირი მყარდება...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
      <span className="size-2 rounded-full bg-rose-500" />
      <span>გათიშულია</span>
    </div>
  );
}