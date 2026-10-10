"use client";

import { EmptyFilePreview } from "./EmptyFilePreview";
import { FileMatchField } from "./FileMatchField";
import { FilePreviewThumb } from "./FilePreviewThumb";
import { getProblemMatchView } from "./get-problem-match-view";
import { ProblemSummary } from "./ProblemSummary";
import type { AssignmentProblemItem, UploadedFileItem } from "./types";

interface ProblemMatchRowProps {
  problem: AssignmentProblemItem;
  index: number;
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

export function ProblemMatchRow({
  problem,
  index,
  uploadedItems,
  matches,
  hoveredItems,
  openDropdown,
  setOpenDropdown,
  onMatchChange,
  onUnmatch,
  onDropdownHover,
  onOpenFullscreen,
}: ProblemMatchRowProps) {
  const { assignedItemId, currentPreviewItem, assignedItem, isDropdownOpen } = getProblemMatchView(
    problem.id,
    uploadedItems,
    matches,
    hoveredItems,
    openDropdown,
  );

  return (
    <div
      className={`relative flex flex-col sm:flex-row items-stretch sm:items-center gap-4 rounded-box border p-4 transition-all ${
        isDropdownOpen ? "z-50 ring-2 ring-navy/20" : "z-10"
      } ${
        assignedItem
          ? "border-emerald-200 bg-emerald-50/20 shadow-sm"
          : "border-hairline bg-white shadow-sm"
      }`}
    >
      <ProblemSummary
        index={index}
        topic={problem.topic}
        promptTex={problem.promptTex}
        assigned={Boolean(assignedItem)}
      />
      <FileMatchField
        problemId={problem.id}
        uploadedItems={uploadedItems}
        assignedItemId={assignedItemId}
        assignedItem={assignedItem}
        isDropdownOpen={isDropdownOpen}
        setOpenDropdown={setOpenDropdown}
        onMatchChange={onMatchChange}
        onDropdownHover={onDropdownHover}
      />
      {currentPreviewItem ? (
        <FilePreviewThumb
          url={currentPreviewItem.url}
          showUnmatch={assignedItemId === currentPreviewItem.id}
          onOpen={() => onOpenFullscreen(currentPreviewItem.url)}
          onUnmatch={() => onUnmatch(problem.id)}
        />
      ) : (
        <EmptyFilePreview />
      )}
    </div>
  );
}
