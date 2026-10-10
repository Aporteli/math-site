import type { Locale } from '@/i18n/config';
import type { BankProblem, ProblemBankCopy } from '@/lib/math/problems';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';

export const EDIT_SOURCES = ['custom', 'verified', 'unchecked', 'ai', 'generated', 'bank'] as const;

export type EditSource = (typeof EDIT_SOURCES)[number];

export type TaxonomySelection = {
  branchId: string | 'all';
  topicNodeId: string | 'all';
  subtopicId: string | 'all';
  conceptId: string | 'all';
};

export interface EditProblemModalProps {
  locale: Locale;
  copy: ProblemBankCopy;
  problem: BankProblem;
  taxonomyNodes: TaxonomyNodeDto[];
  onTaxonomyChange?: (nodes: TaxonomyNodeDto[]) => void;
  onClose: () => void;
  onSave: (problem: BankProblem) => Promise<boolean>;
}
