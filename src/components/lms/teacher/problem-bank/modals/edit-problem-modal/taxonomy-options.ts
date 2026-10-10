import type { Locale } from '@/i18n/config';
import { childrenOf, taxonomyLabel, type TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import type { TaxonomySelection } from './types';

export function taxonomyLabelsFor(nodes: TaxonomyNodeDto[], locale: Locale): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const node of nodes) {
    labels[node.id] = taxonomyLabel(node, locale);
  }
  return labels;
}

export function branchOptionIds(nodes: TaxonomyNodeDto[]): string[] {
  return childrenOf(nodes, null, 'branch').map((n) => n.id);
}

export function topicOptionIds(nodes: TaxonomyNodeDto[], branchId: TaxonomySelection['branchId']): string[] {
  if (branchId === 'all') {
    return nodes.filter((n) => n.level === 'topic').map((n) => n.id);
  }
  return childrenOf(nodes, branchId, 'topic').map((n) => n.id);
}

export function subtopicOptionIds(nodes: TaxonomyNodeDto[], topicNodeId: TaxonomySelection['topicNodeId']): string[] {
  if (topicNodeId === 'all') return [] as string[];
  return childrenOf(nodes, topicNodeId, 'subtopic').map((n) => n.id);
}

export function conceptOptionIds(nodes: TaxonomyNodeDto[], subtopicId: TaxonomySelection['subtopicId']): string[] {
  if (subtopicId === 'all') return [] as string[];
  return childrenOf(nodes, subtopicId, 'concept').map((n) => n.id);
}
