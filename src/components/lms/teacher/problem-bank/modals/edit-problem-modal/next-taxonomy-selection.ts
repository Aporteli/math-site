import type { TaxonomySelection } from './types';

export function nextTaxonomySelection(
  current: TaxonomySelection,
  key: keyof TaxonomySelection,
  value: string | 'all',
): TaxonomySelection {
  const next = { ...current, [key]: value };
  if (key === 'branchId') {
    next.topicNodeId = 'all';
    next.subtopicId = 'all';
    next.conceptId = 'all';
  } else if (key === 'topicNodeId') {
    next.subtopicId = 'all';
    next.conceptId = 'all';
  } else if (key === 'subtopicId') {
    next.conceptId = 'all';
  }
  return next;
}
