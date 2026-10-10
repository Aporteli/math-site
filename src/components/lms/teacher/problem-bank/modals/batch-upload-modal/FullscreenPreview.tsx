"use client";

import { X } from "lucide-react";

export function FullscreenPreview({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <button
          type="button"
          className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-box bg-white/10 text-white transition-colors hover:bg-rose-500"
          onClick={onClose}
        >
          <X className="size-6" />
        </button>
        <img
          src={url}
          alt="გადიდებული"
          className="max-h-[95vh] max-w-[95vw] rounded-box object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
