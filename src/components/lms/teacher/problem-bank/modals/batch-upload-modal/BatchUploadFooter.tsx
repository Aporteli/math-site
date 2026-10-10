"use client";

import { CheckCircle2 } from "lucide-react";

interface BatchUploadFooterProps {
  matchedCount: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchUploadFooter({
  matchedCount,
  loading,
  onClose,
  onConfirm,
}: BatchUploadFooterProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-hairline bg-paper/40 px-6 py-4">
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-box border border-hairline bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-paper"
      >
        გაუქმება
      </button>

      <button
        type="button"
        disabled={matchedCount === 0 || loading}
        onClick={onConfirm}
        className="inline-flex shrink-0 items-center gap-2 rounded-box bg-[#465D73] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#526C85] disabled:opacity-40 active:scale-95"
      >
        <CheckCircle2 className="size-4" />
        <span>მიბმა ({matchedCount})</span>
      </button>
    </div>
  );
}
