"use client";

import { Sparkles, X } from "lucide-react";

export function BatchUploadHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline bg-gradient-to-b from-paper/60 to-white px-6 py-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-box border border-navy/10 bg-navy-tint text-navy">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-ink leading-tight">
            ინდივიდუალური მიბმა
          </h3>
          <p className="text-xs text-muted mt-0.5">
            ატვირთეთ ფაილები და გაანაწილეთ სათითაოდ ბილეთებზე
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex size-9 shrink-0 items-center justify-center rounded-box border border-hairline bg-white text-muted shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
