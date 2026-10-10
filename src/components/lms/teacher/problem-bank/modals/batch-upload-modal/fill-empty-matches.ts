import type { AssignmentProblemItem, UploadedFileItem } from "./types";

export function fillEmptyMatches(
  problems: AssignmentProblemItem[],
  matches: Record<string, string>,
  allItems: UploadedFileItem[],
): Record<string, string> {
  const newMatches: Record<string, string> = { ...matches };
  problems.forEach((prob, index) => {
    if (!newMatches[prob.id] && allItems[index]) {
      newMatches[prob.id] = allItems[index].id;
    }
  });
  return newMatches;
}
