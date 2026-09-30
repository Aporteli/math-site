export interface TriangleStep {
  title: string;
  explanation: string;
  latex: string;
}

export interface TriangleSolution {
  a: number;
  b: number;
  c: number;
  A: number;
  B: number;
  C: number;
  area: number;
  perimeter: number;
  semiperimeter: number;
  R: number | null;
  r: number;
  heights: { a: number; b: number; c: number };
  medians: { a: number; b: number; c: number };
  bisectors: { a: number; b: number; c: number };
  tri_type: 'right' | 'obtuse' | 'acute';
  shape_type: 'equilateral' | 'isosceles' | 'scalene';
  steps?: TriangleStep[];
  kind?: string;
}

export interface TriangleResult {
  solutions: TriangleSolution[];
  ambiguous: boolean;
}

export const TRIANGLE_HISTORY_KEY = 'pinf.triangle.history';

export interface TriangleHistoryItem {
  a: string;
  b: string;
  c: string;
  A: string;
  B: string;
  C: string;
}

export const TRIANGLE_EXAMPLES: {
  label: string;
  values: Partial<TriangleHistoryItem>;
}[] = [
  { label: 'SSS: 3, 4, 5', values: { a: '3', b: '4', c: '5' } },
  { label: 'SAS: b=5, c=7, A=60°', values: { b: '5', c: '7', A: '60' } },
  { label: 'ASA: A=40°, B=60°, c=5', values: { A: '40', B: '60', c: '5' } },
  { label: 'AAS: A=30°, B=45°, a=4', values: { A: '30', B: '45', a: '4' } },
  {
    label: 'SSA (ორი ამონახსნი): a=5, b=8, A=30°',
    values: { a: '5', b: '8', A: '30' },
  },
  { label: 'ტოლგვერდა: 8, 8, 8', values: { a: '8', b: '8', c: '8' } },
];