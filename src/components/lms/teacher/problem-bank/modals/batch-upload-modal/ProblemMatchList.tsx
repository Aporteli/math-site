"use client";

import { ProblemMatchRow } from "./ProblemMatchRow";
import type { AssignmentProblemItem, UploadedFileItem } from "./types";

interface ProblemMatchListProps {
  problems: AssignmentProblemItem[];
  uploadedItems: UploadedFileItem[];
  matches: Record<string, string>;
  hoveredItems: Record<string, string | null>;
  openDropdown: string | null;
  setOpenDropdown: (id: string | null) => void;
  onMatchChange: (problemId: string, itemId: string) => void;
  onUnmatch: (problemId: string) => void;
  onDropdownHover: (problemId: string, itemId: string | null) => void;
  onOpenFullscreen: (url: string) => void;
}

export function ProblemMatchList({
  problems,
  uploadedItems,
  matches,
  hoveredItems,
  openDropdown,
  setOpenDropdown,
  onMatchChange,
  onUnmatch,
  onDropdownHover,
  onOpenFullscreen,
}: ProblemMatchListProps) {
  return (
    <div className="space-y-3">
      {problems.map((problem, idx) => (
        <ProblemMatchRow
          key={problem.id}
          problem={problem}
          index={idx}
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
      ))}
    </div>
  );
}
