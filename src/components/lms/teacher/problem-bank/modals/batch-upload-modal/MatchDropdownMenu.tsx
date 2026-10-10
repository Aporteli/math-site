"use client";

import { FileOptionButton } from "./FileOptionButton";
import type { UploadedFileItem } from "./types";

interface MatchDropdownMenuProps {
  problemId: string;
  uploadedItems: UploadedFileItem[];
  assignedItemId?: string;
  onMatchChange: (problemId: string, itemId: string) => void;
  setOpenDropdown: (id: string | null) => void;
  onDropdownHover: (problemId: string, itemId: string | null) => void;
}

export function MatchDropdownMenu({
  problemId,
  uploadedItems,
  assignedItemId,
  onMatchChange,
  setOpenDropdown,
  onDropdownHover,
}: MatchDropdownMenuProps) {
  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-box border border-hairline bg-white shadow-2xl custom-scrollbar"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onMatchChange(problemId, "");
          setOpenDropdown(null);
          onDropdownHover(problemId, null);
        }}
        onMouseEnter={() => onDropdownHover(problemId, null)}
        className="w-full border-b border-hairline-soft px-3 py-3 text-left text-xs font-medium text-muted transition-colors hover:bg-paper"
      >
        (არ არის მიბმული)
      </button>

      {uploadedItems.map((item, itemIdx) => {
        const isSelected = assignedItemId === item.id;
        return (
          <FileOptionButton
            key={item.id}
            index={itemIdx}
            name={item.name}
            selected={isSelected}
            onClick={() => {
              onMatchChange(problemId, item.id);
              setOpenDropdown(null);
              onDropdownHover(problemId, null);
            }}
            onMouseEnter={() => onDropdownHover(problemId, item.id)}
            onMouseLeave={() => onDropdownHover(problemId, null)}
          />
        );
      })}
    </div>
  );
}
