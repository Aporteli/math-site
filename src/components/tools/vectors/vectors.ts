export interface VectorQuantity {
  id: string;
  latex: string;
  numeric: number | null;
}

export interface VectorResult {
  mode: 'points' | 'vectors';
  dimension: 2 | 3;
  quantities: VectorQuantity[];
}

export const VECTOR_HISTORY_KEY = 'mathlab.vectors.history';

export type VectorMode = 'points' | 'vectors';

export interface VectorInput {
  mode: VectorMode;
  dimension: 2 | 3;
  a: string[];
  b: string[];
}

export const VECTOR_EXAMPLES: (VectorInput & { label: string })[] = [
  { label: '(0,0) → (3,4)', mode: 'points', dimension: 2, a: ['0', '0'], b: ['3', '4'] },
  { label: '(1,2,3) → (4,6,8)', mode: 'points', dimension: 3, a: ['1', '2', '3'], b: ['4', '6', '8'] },
  { label: '(1,2,3) · (4,−5,6)', mode: 'vectors', dimension: 3, a: ['1', '2', '3'], b: ['4', '-5', '6'] },
  { label: 'i × j', mode: 'vectors', dimension: 3, a: ['1', '0', '0'], b: ['0', '1', '0'] },
  { label: '(1,0) · (0,1)', mode: 'vectors', dimension: 2, a: ['1', '0'], b: ['0', '1'] },
];
