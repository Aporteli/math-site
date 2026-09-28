export interface SequenceQuantity {
  id: string;
  latex: string;
  numeric: number | null;
}

export interface SequenceResult {
  kind: 'arithmetic' | 'geometric' | 'series';
  converges: boolean | null;
  quantities: SequenceQuantity[];
}

export const SEQUENCE_HISTORY_KEY = 'mathlab.sequences.history';

export type SequenceKind = 'arithmetic' | 'geometric' | 'series';

export interface SequenceInput {
  kind: SequenceKind;
  a: string;
  d: string;
  r: string;
  n: string;
  term: string;
  variable: string;
}

export const SEQUENCE_EXAMPLES: (SequenceInput & { label: string })[] = [
  { label: 'AP 2,3,10', kind: 'arithmetic', a: '2', d: '3', r: '', n: '10', term: '', variable: 'n' },
  { label: 'GP 1, 1/2', kind: 'geometric', a: '1', d: '', r: '1/2', n: '10', term: '', variable: 'n' },
  { label: '1/n²', kind: 'series', a: '', d: '', r: '', n: '', term: '1/n**2', variable: 'n' },
  { label: '1/n', kind: 'series', a: '', d: '', r: '', n: '', term: '1/n', variable: 'n' },
  { label: '(−1)^(n+1)/n', kind: 'series', a: '', d: '', r: '', n: '5', term: '(-1)**(n+1)/n', variable: 'n' },
];
