export function getMatchProgress(matchedCount: number, problemCount: number) {
  const totalCount = Math.max(problemCount, 1);
  return Math.min(100, Math.round((matchedCount / totalCount) * 100));
}
