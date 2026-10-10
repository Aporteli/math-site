import type { BankProblem } from '@/lib/math/problems';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import type { TaxonomySelection } from './types';

export function initialTaxonomy(problem: BankProblem, nodes: TaxonomyNodeDto[]): TaxonomySelection {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  let branchId = problem.branchId && byId.has(problem.branchId) ? problem.branchId : ('all' as const);
  let topicNodeId = problem.topicNodeId && byId.has(problem.topicNodeId) ? problem.topicNodeId : ('all' as const);
  let subtopicId = problem.subtopicId && byId.has(problem.subtopicId) ? problem.subtopicId : ('all' as const);
  const conceptId = problem.conceptId && byId.has(problem.conceptId) ? problem.conceptId : ('all' as const);

  // Infer from stored FKs upward when only a deeper id is set.
  if (conceptId !== 'all') {
    const concept = byId.get(conceptId);
    if (concept?.parentId) subtopicId = concept.parentId;
  }
  if (subtopicId !== 'all') {
    const subtopic = byId.get(subtopicId);
    if (subtopic?.parentId) topicNodeId = subtopic.parentId;
  }
  if (topicNodeId !== 'all') {
    const topic = byId.get(topicNodeId);
    if (topic?.parentId) branchId = topic.parentId;
  }

  // Legacy string topic → taxonomy topic node (by slug).
  if (topicNodeId === 'all' && problem.topic) {
    const match = nodes.find((node) => node.level === 'topic' && node.slug === problem.topic);
    if (match) {
      topicNodeId = match.id;
      if (match.parentId) branchId = match.parentId;
    }
  }

  return { branchId, topicNodeId, subtopicId, conceptId };
}
