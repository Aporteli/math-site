"use client";

interface MatchProgressProps {
  matchedCount: number;
  problemCount: number;
  progressPct: number;
}

export function MatchProgress({ matchedCount, problemCount, progressPct }: MatchProgressProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
          შესაბამისობა
        </h4>
        <span className="text-xs font-bold text-navy">
          {matchedCount}/{problemCount}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-box bg-paper-deep">
        <div
          className="h-full rounded-box bg-[#465D73] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
