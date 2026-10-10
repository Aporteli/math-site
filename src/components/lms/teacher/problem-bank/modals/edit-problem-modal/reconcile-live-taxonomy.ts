import type { BankProblem } from '@/lib/math/problems';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { initialTaxonomy } from './initial-taxonomy';
import type { TaxonomySelection } from './types';

export function reconcileLiveTaxonomy(
  current: TaxonomySelection,
  problem: BankProblem,
  fresh: TaxonomyNodeDto[],
): TaxonomySelection {
  const next = initialTaxonomy(
    {
      ...problem,
      branchId: current.branchId === 'all' ? undefined : current.branchId,
      topicNodeId: current.topicNodeId === 'all' ? undefined : current.topicNodeId,
      subtopicId: current.subtopicId === 'all' ? undefined : current.subtopicId,
      conceptId: current.conceptId === 'all' ? undefined : current.conceptId,
    },
    fresh,
  );
  // Prefer live selection if still present; otherwise re-init from problem.
  const ids = new Set(fresh.map((node) => node.id));
  return {
    branchId: current.branchId !== 'all' && ids.has(current.branchId) ? current.branchId : next.branchId,
    topicNodeId:
      current.topicNodeId !== 'all' && ids.has(current.topicNodeId) ? current.topicNodeId : next.topicNodeId,
    subtopicId: current.subtopicId !== 'all' && ids.has(current.subtopicId) ? current.subtopicId : next.subtopicId,
    conceptId: current.conceptId !== 'all' && ids.has(current.conceptId) ? current.conceptId : next.conceptId,
  };
}
