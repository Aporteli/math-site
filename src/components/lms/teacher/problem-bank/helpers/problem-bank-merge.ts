import type { BankProblem } from '@/lib/math/problems';

export function remapIds(ids: string[], idMap: Record<string, string>) {
  return ids.map((id) => idMap[id] ?? id);
}

export function mergeSaved(current: BankProblem[], saved: BankProblem[], idMap: Record<string, string>) {
  const replaced = new Set(Object.keys(idMap));
  const savedIds = new Set(saved.map((problem) => problem.id));
  const rest = current.filter((problem) => !replaced.has(problem.id) && !savedIds.has(problem.id));
  return [...saved, ...rest];
}
