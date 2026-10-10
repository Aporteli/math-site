'use client';

import { PROBLEM_DIFFICULTIES, EMPTY_PROBLEM_FILTERS, type ProblemBankCopy, type ProblemFilters } from '@/lib/math/problems';
import { fieldClass } from '../helpers/problem-bank.helpers';
import type { TaxonomyFilterKey } from '../helpers/problem-bank.helpers';
import { FilterSelect } from './FilterSelect';

type ProblemBankFiltersProps = {
  copy: ProblemBankCopy;
  searchId: string;
  filters: ProblemFilters;
  updateFilter: <K extends keyof ProblemFilters>(key: K, value: ProblemFilters[K]) => void;
  branchOptions: string[];
  topicOptions: string[];
  taxonomyLabels: Record<string, string>;
  updateTaxonomyFilter: (key: TaxonomyFilterKey, value: string) => void;
  setFilters: (filters: ProblemFilters) => void;
};

export function ProblemBankFilters({
  copy,
  searchId,
  filters,
  updateFilter,
  branchOptions,
  topicOptions,
  taxonomyLabels,
  updateTaxonomyFilter,
  setFilters,
}: ProblemBankFiltersProps) {
  return (
    <aside className="relative z-20 order-1 flex min-h-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm">
      <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
      <div className="flex min-h-0 flex-1 flex-col ">
        <h2 className="shrink-0 bg-sectionHeader border-b border-hairline py-5 px-4 text-sm font-semibold tracking-wide text-brass">
          {copy.filtersTitle}
        </h2>
        <div className="mt-4 bg-main min-h-0 flex-1 space-y-8 overflow-y-auto gap-10 px-4 py-3">
          <label className="sr-only" htmlFor={searchId}>
            {copy.searchLabel}
          </label>
          <input
            id={searchId}
            className={fieldClass}
            type="search"
            value={filters.query}
            placeholder={copy.searchPlaceholder}
            onChange={(event) => updateFilter('query', event.target.value)}
          />

          <div className="space-y-5 border-t border-hairline-soft pt-3">
            <FilterSelect
              key="filter-branch"
              label={copy.branchFilter}
              value={filters.branchId}
              allLabel={copy.allBranches}
              options={branchOptions}
              labels={taxonomyLabels}
              onChange={(value) => updateTaxonomyFilter('branchId', value)}
            />
            <FilterSelect
              key="filter-topic"
              label={copy.topicFilter}
              value={filters.topicNodeId}
              allLabel={copy.allTopics}
              options={topicOptions}
              labels={taxonomyLabels}
              onChange={(value) => updateTaxonomyFilter('topicNodeId', value)}
            />
            <FilterSelect
              key="filter-difficulty"
              label={copy.generate.difficulty}
              value={filters.difficulty}
              allLabel={copy.allDifficulties}
              options={PROBLEM_DIFFICULTIES}
              labels={copy.difficulties}
              onChange={(value) => updateFilter('difficulty', value)}
            />
          </div>
          <div className="border-t flex justify-center border-hairline-soft pt-3">
            <button
              type="button"
              className="mt-6 flex w-50 shrink-0 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main px-4 py-2.5 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-mainButtonHover"
              onClick={() => setFilters(EMPTY_PROBLEM_FILTERS)}>
              {copy.resetFilters}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
