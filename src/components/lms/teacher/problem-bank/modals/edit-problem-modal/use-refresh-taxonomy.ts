'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { BankProblem } from '@/lib/math/problems';
import { loadTaxonomyAction } from '@/lib/math/problems/actions';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { reconcileLiveTaxonomy } from './reconcile-live-taxonomy';
import type { TaxonomySelection } from './types';

export function useRefreshTaxonomy(
  problem: BankProblem,
  onTaxonomyChange: ((nodes: TaxonomyNodeDto[]) => void) | undefined,
  setNodes: Dispatch<SetStateAction<TaxonomyNodeDto[]>>,
  setTaxonomy: Dispatch<SetStateAction<TaxonomySelection>>,
) {
  // Pull latest curriculum tree whenever the modal opens.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fresh = await loadTaxonomyAction();
      if (cancelled) return;
      setNodes(fresh);
      onTaxonomyChange?.(fresh);
      setTaxonomy((current) => reconcileLiveTaxonomy(current, problem, fresh));
    })();
    return () => {
      cancelled = true;
    };
  }, [problem, onTaxonomyChange, setNodes, setTaxonomy]);
}
