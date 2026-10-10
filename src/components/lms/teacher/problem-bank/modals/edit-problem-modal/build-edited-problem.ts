import type { BankProblem, ProblemDifficulty, ProblemYear } from '@/lib/math/problems';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { applySource } from './source';
import type { EditSource, TaxonomySelection } from './types';

export function buildEditedProblem({
  problem,
  source,
  promptTex,
  solutionTex,
  difficulty,
  year,
  taxonomy,
  nodes,
}: {
  problem: BankProblem;
  source: EditSource;
  promptTex: string;
  solutionTex: string;
  difficulty: ProblemDifficulty;
  year: ProblemYear | '';
  taxonomy: TaxonomySelection;
  nodes: TaxonomyNodeDto[];
}): BankProblem {
  const topicNode = taxonomy.topicNodeId !== 'all' ? nodes.find((node) => node.id === taxonomy.topicNodeId) : undefined;

  const sourced = applySource(problem, source);
  const next: BankProblem = {
    ...problem,
    ...sourced,
    topic: topicNode?.slug || problem.topic,
    difficulty,
    promptTex,
    solutionTex,
    branchId: taxonomy.branchId === 'all' ? undefined : taxonomy.branchId,
    topicNodeId: taxonomy.topicNodeId === 'all' ? undefined : taxonomy.topicNodeId,
    subtopicId: taxonomy.subtopicId === 'all' ? undefined : taxonomy.subtopicId,
    conceptId: taxonomy.conceptId === 'all' ? undefined : taxonomy.conceptId,
  };
  if (year) next.year = year;
  else delete next.year;
  return next;
}
