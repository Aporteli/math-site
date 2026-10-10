import type { BankProblem } from '@/lib/math/problems';

export function buildProblemPayload(problem: BankProblem) {
  return {
    id: (problem as unknown as { id?: string }).id || problem.originId || problem.templateId,
    topic: problem.topic,
    difficulty: problem.difficulty,
    promptTex: problem.promptTex,
    solutionTex: problem.solutionTex,
    templateId: problem.templateId,
  };
}
