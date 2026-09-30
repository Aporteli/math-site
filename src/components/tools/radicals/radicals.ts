export interface RadicalSolution {
  latex: string;
  numeric: number | null;
}

export interface RadicalSimplifyResult {
  mode: 'simplify';
  inputLatex: string;
  simplifiedLatex: string;
  rationalizedLatex?: string | null;
  numeric: number | null;
}

export interface RadicalSolveResult {
  mode: 'solve';
  identity: boolean;
  inputLatex: string;
  solutions: RadicalSolution[];
}

export type RadicalResult = RadicalSimplifyResult | RadicalSolveResult;

export const RADICAL_HISTORY_KEY = 'pinf.radicals.history';

export interface RadicalInput {
  expression: string;
  variable: string;
}

export const RADICAL_EXAMPLES: (RadicalInput & { label: string })[] = [
  { label: '√50', expression: 'sqrt(50)', variable: 'x' },
  { label: '√12 + √75', expression: 'sqrt(12) + sqrt(75)', variable: 'x' },
  { label: '1/(√3−1)', expression: '1/(sqrt(3)-1)', variable: 'x' },
  { label: '√(4+2√3)', expression: 'sqrt(4+2*sqrt(3))', variable: 'x' },
  { label: '∛54', expression: 'root(54, 3)', variable: 'x' },
  { label: '√(x+1) = 3', expression: 'sqrt(x+1) = 3', variable: 'x' },
];
