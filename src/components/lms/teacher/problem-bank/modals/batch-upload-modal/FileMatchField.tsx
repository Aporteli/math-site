"use client";

import { ArrowRightLeft, ChevronDown } from "lucide-react";
import { MatchDropdownMenu } from "./MatchDropdownMenu";
import type { UploadedFileItem } from "./types";

interface FileMatchFieldProps {
  problemId: string;
  uploadedItems: UploadedFileItem[];
  assignedItemId?: string;
  assignedItem?: UploadedFileItem;
  isDropdownOpen: boolean;
  setOpenDropdown: (id: string | null) => void;
  onMatchChange: (problemId: string, itemId: string) => void;
  onDropdownHover: (problemId: string, itemId: string | null) => void;
}

export function FileMatchField({
  problemId,
  uploadedItems,
  assignedItemId,
  assignedItem,
  isDropdownOpen,
  setOpenDropdown,
  onMatchChange,
  onDropdownHover,
}: FileMatchFieldProps) {
  return (
    <div className="w-full shrink-0 sm:w-56">
      <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        <ArrowRightLeft className="size-3" />
        მიბმული ფაილი
      </label>
      <div className="relative w-full">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isDropdownOpen ? null : problemId);
          }}
          className={`flex w-full items-center justify-between rounded-box border py-2 px-3 text-xs font-bold transition-colors ${
            assignedItem
              ? "border-emerald-300 bg-white text-emerald-800"
              : "border-hairline bg-paper text-ink"
          }`}
        >
          <span className="truncate">
            {assignedItem ? assignedItem.name : "(არ არის მიბმული)"}
          </span>
          <ChevronDown
            className={`size-3.5 shrink-0 ml-2 transition-transform ${
              isDropdownOpen ? "rotate-180 opacity-100" : "opacity-50"
            }`}
          />
        </button>

        {isDropdownOpen && (
          <MatchDropdownMenu
            problemId={problemId}
            uploadedItems={uploadedItems}
            assignedItemId={assignedItemId}
            onMatchChange={onMatchChange}
            setOpenDropdown={setOpenDropdown}
            onDropdownHover={onDropdownHover}
          />
        )}
      </div>
    </div>
  );
}
