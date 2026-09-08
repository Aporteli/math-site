"use client";

import { useState, useCallback } from "react";
import { useMaybeRoomContext } from "@livekit/components-react";
import { Track, LocalVideoTrack } from "livekit-client";
import { BackgroundBlur } from "@livekit/track-processors";

export function BlurToggleButton() {
  const room = useMaybeRoomContext();
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const [blurRadius, setBlurRadius] = useState<number>(25); // ძლიერი სტანდარტი
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processor, setProcessor] = useState<ReturnType<typeof BackgroundBlur> | null>(null);

  const applyBlur = useCallback(
    async (radius: number, enable: boolean) => {
      if (!room) return;

      const localParticipant = room.localParticipant;
      const trackPublication = localParticipant.getTrackPublication(Track.Source.Camera);

      if (!trackPublication || !trackPublication.track) {
        alert("კამერა ჩართული არ არის!");
        return;
      }

      const videoTrack = trackPublication.track as LocalVideoTrack;
      setIsLoading(true);

      try {
        if (processor) {
          await videoTrack.stopProcessor();
          setProcessor(null);
        }

        if (enable) {
          // მაღალი ხარისხის ბლარი
          const blurProcessor = BackgroundBlur(radius);
          
          await videoTrack.setProcessor(blurProcessor);
          setProcessor(blurProcessor);
          setIsBlurred(true);
        } else {
          setIsBlurred(false);
        }
      } catch (error) {
        console.error("Failed to set blur processor:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [room, processor]
  );

  if (!room) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => applyBlur(blurRadius, !isBlurred)}
        disabled={isLoading}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
          isBlurred
            ? "bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
        } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isBlurred ? "animate-pulse bg-slate-950" : "bg-slate-500"
          }`}
        />
        {isLoading ? "მუშავდება..." : isBlurred ? "Blur On" : "Blur Off"}
      </button>

      {isBlurred && (
        <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
          {/* გაზრდილი ინტენსივობის დონეები: 15, 25, 40 */}
          {[15, 25, 40].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                setBlurRadius(level);
                applyBlur(level, true);
              }}
              disabled={isLoading}
              className={`rounded px-2 py-0.5 text-[10px] transition-all ${
                blurRadius === level
                  ? "border border-amber-500/40 bg-amber-500/20 font-bold text-amber-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {level === 15 ? "Low" : level === 25 ? "Med" : "High (40)"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}