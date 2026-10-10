"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";

interface ProblemSummaryProps {
  index: number;
  topic: string;
  promptTex?: string;
  assigned: boolean;
}

export function ProblemSummary({ index, topic, promptTex, assigned }: ProblemSummaryProps) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-box bg-[#465D73] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] text-[10px] font-bold text-white">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
          {topic || `ამოცანა ${index + 1}`}
        </span>
        {assigned ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        ) : (
          <AlertCircle className="size-4 shrink-0 text-amber-400" />
        )}
      </div>

      {promptTex && (
        <div className="relative max-h-[70px] overflow-hidden rounded-box border border-hairline-soft bg-paper/50 p-2.5">
          <KatexPreview
            tex={promptTex}
            className="text-[11px] sm:text-xs text-ink/80 leading-relaxed"
          />
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-paper/90 to-transparent" />
        </div>
      )}
    </div>
  );
}
