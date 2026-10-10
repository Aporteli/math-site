import type { UploadedFileItem } from "./types";

export function getProblemMatchView(
  problemId: string,
  uploadedItems: UploadedFileItem[],
  matches: Record<string, string>,
  hoveredItems: Record<string, string | null>,
  openDropdown: string | null,
) {
  const assignedItemId = matches[problemId];
  const currentPreviewId = hoveredItems[problemId] || assignedItemId;
  const currentPreviewItem = uploadedItems.find((u) => u.id === currentPreviewId);
  const assignedItem = uploadedItems.find((u) => u.id === assignedItemId);
  const isDropdownOpen = openDropdown === problemId;

  return {
    assignedItemId,
    currentPreviewItem,
    assignedItem,
    isDropdownOpen,
  };
}
