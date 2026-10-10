import type { SetProblem } from '../../types/teacher-workspace.types';

export function filterSetProblems(availableSetProblems: SetProblem[], problemSearchQuery: string) {
  return availableSetProblems.filter(
    (p) =>
      p.title.toLowerCase().includes(problemSearchQuery.toLowerCase()) ||
      p.setTitle.toLowerCase().includes(problemSearchQuery.toLowerCase()),
  );
}
