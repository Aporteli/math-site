export interface CombinatoricsResult {
  kind: 'P' | 'A' | 'C' | 'binomial';
  formulaLatex: string | null;
  valueLatex: string | null;
  numeric: number | null;
  expandedLatex: string | null;
}

export const COMB_HISTORY_KEY = 'mathlab.combinatorics.history';

export type CombKind = 'P' | 'A' | 'C' | 'binomial';

export interface CombInput {
  kind: CombKind;
  n: string;
  k: string;
  repetition: boolean;
  expression: string;
}

export const COMB_EXAMPLES: (CombInput & { label: string })[] = [
  { label: 'P(5)', kind: 'P', n: '5', k: '', repetition: false, expression: '' },
  { label: 'A(10,3)', kind: 'A', n: '10', k: '3', repetition: false, expression: '' },
  { label: 'C(10,3)', kind: 'C', n: '10', k: '3', repetition: false, expression: '' },
  { label: 'C̄(5,2)', kind: 'C', n: '5', k: '2', repetition: true, expression: '' },
  { label: 'n^k', kind: 'A', n: '5', k: '2', repetition: true, expression: '' },
  { label: '(x+y)^5', kind: 'binomial', n: '5', k: '2', repetition: false, expression: '(x+y)^5' },
  { label: 'C(n,k)', kind: 'C', n: 'n', k: 'k', repetition: false, expression: '' },
];
