'use client';

import type { ProblemBankCopy } from '@/lib/math/problems';
import { TaxonomySelect } from './TaxonomySelect';
import type { TaxonomySelection } from './types';

export function EditProblemTaxonomyFields({
  titleId,
  copy,
  taxonomy,
  taxonomyLabels,
  branchOptions,
  topicOptions,
  subtopicOptions,
  conceptOptions,
  onTaxonomyChange,
}: {
  titleId: string;
  copy: ProblemBankCopy;
  taxonomy: TaxonomySelection;
  taxonomyLabels: Record<string, string>;
  branchOptions: readonly string[];
  topicOptions: readonly string[];
  subtopicOptions: readonly string[];
  conceptOptions: readonly string[];
  onTaxonomyChange: (key: keyof TaxonomySelection, value: string | 'all') => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TaxonomySelect
        id={`${titleId}-branch`}
        label={copy.branchFilter}
        value={taxonomy.branchId}
        allLabel={copy.allBranches}
        options={branchOptions}
        labels={taxonomyLabels}
        onChange={(value) => onTaxonomyChange('branchId', value)}
      />
      <TaxonomySelect
        id={`${titleId}-topic`}
        label={copy.topicFilter}
        value={taxonomy.topicNodeId}
        allLabel={copy.allTopics}
        options={topicOptions}
        labels={taxonomyLabels}
        onChange={(value) => onTaxonomyChange('topicNodeId', value)}
      />
      <TaxonomySelect
        id={`${titleId}-subtopic`}
        label={copy.subtopicFilter}
        value={taxonomy.subtopicId}
        allLabel={copy.allSubtopics}
        options={subtopicOptions}
        labels={taxonomyLabels}
        onChange={(value) => onTaxonomyChange('subtopicId', value)}
      />
      <TaxonomySelect
        id={`${titleId}-concept`}
        label={copy.conceptFilter}
        value={taxonomy.conceptId}
        allLabel={copy.allConcepts}
        options={conceptOptions}
        labels={taxonomyLabels}
        onChange={(value) => onTaxonomyChange('conceptId', value)}
      />
    </div>
  );
}
