import type { AppliedAssignment, UploadedFileItem } from "./types";

export function buildAssignmentResults(
  matches: Record<string, string>,
  uploadedItems: UploadedFileItem[],
): AppliedAssignment[] {
  return Object.entries(matches)
    .map(([problemId, itemId]) => {
      const item = uploadedItems.find((u) => u.id === itemId);
      if (!item) return null;
      return {
        problemId,
        previewUrl: item.url,
        fileName: item.name,
      };
    })
    .filter(Boolean) as AppliedAssignment[];
}
