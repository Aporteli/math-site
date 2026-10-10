"use client";

import { X, ZoomIn } from "lucide-react";

interface FilePreviewThumbProps {
  url: string;
  showUnmatch: boolean;
  onOpen: () => void;
  onUnmatch: () => void;
}

export function FilePreviewThumb({ url, showUnmatch, onOpen, onUnmatch }: FilePreviewThumbProps) {
  return (
    <div className="group relative shrink-0 self-center transition-all duration-200 sm:self-center">
      <img
        src={url}
        alt="Preview"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="h-24 w-28 rounded-box border border-hairline bg-white object-cover shadow-sm transition-transform cursor-zoom-in group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-box bg-slate-900/0 transition-all group-hover:bg-slate-900/20">
        <span className="flex items-center gap-1.5 rounded-box border border-white/50 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <ZoomIn className="size-3" /> გადიდება
        </span>
      </div>
      {showUnmatch && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnmatch();
          }}
          className="absolute -top-2 -right-2 z-20 flex size-6 items-center justify-center rounded-box bg-rose-500 text-white shadow-md transition-colors hover:bg-rose-600"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
