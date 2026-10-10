"use client";

import { MatchProgress } from "./MatchProgress";
import { ProblemMatchList } from "./ProblemMatchList";
import type { AssignmentProblemItem, UploadedFileItem } from "./types";

interface MatchSectionProps {
  problems: AssignmentProblemItem[];
  uploadedItems: UploadedFileItem[];
  matches: Record<string, string>;
  hoveredItems: Record<string, string | null>;
  openDropdown: string | null;
  setOpenDropdown: (id: string | null) => void;
  matchedCount: number;
  progressPct: number;
  onMatchChange: (problemId: string, itemId: string) => void;
  onUnmatch: (problemId: string) => void;
  onDropdownHover: (problemId: string, itemId: string | null) => void;
  onOpenFullscreen: (url: string) => void;
}

export function MatchSection({
  problems,
  uploadedItems,
  matches,
  hoveredItems,
  openDropdown,
  setOpenDropdown,
  matchedCount,
  progressPct,
  onMatchChange,
  onUnmatch,
  onDropdownHover,
  onOpenFullscreen,
}: MatchSectionProps) {
  return (
    <div className="space-y-4">
      <MatchProgress
        matchedCount={matchedCount}
        problemCount={problems.length}
        progressPct={progressPct}
      />
      <ProblemMatchList
        problems={problems}
        uploadedItems={uploadedItems}
        matches={matches}
        hoveredItems={hoveredItems}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        onMatchChange={onMatchChange}
        onUnmatch={onUnmatch}
        onDropdownHover={onDropdownHover}
        onOpenFullscreen={onOpenFullscreen}
      />
    </div>
  );
}
