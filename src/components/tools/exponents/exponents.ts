export interface ExpSolution {
  latex: string;
  numeric: number | null;
}

export interface ExpSimplifyResult {
  mode: 'simplify';
  inputLatex: string;
  simplifiedLatex: string;
  expandedLatex?: string | null;
  numericLatex?: string | null;
}

export interface ExpSolveResult {
  mode: 'solve';
  identity: boolean;
  inputLatex: string;
  solutions?: ExpSolution[];
  solutionLatex?: string | null;
}

export type ExpResult = ExpSimplifyResult | ExpSolveResult;

export const EXP_HISTORY_KEY = 'mathlab.exponent.history';

export interface ExpHistoryItem {
  expression: string;
  variable: string;
}

export const EXP_VARIABLES = ['x', 'y', 'a', 'n', 't'] as const;

export const EXP_EXAMPLES: { label: string; expression: string; variable: string }[] = [
  { label: '2^10', expression: '2^10', variable: 'x' },
  { label: '(2^3)^4', expression: '(2^3)^4', variable: 'x' },
  { label: 'a^5 * a^(-2)', expression: 'a^5 * a^(-2)', variable: 'a' },
  { label: '(x*y)^3 / x^2', expression: '(x*y)^3 / x^2', variable: 'x' },
  { label: '(x+1)^5', expression: '(x+1)^5', variable: 'x' },
  { label: '2^(x+1) = 16', expression: '2^(x+1) = 16', variable: 'x' },
  { label: '9^x = 27^(x-1)', expression: '9^x = 27^(x-1)', variable: 'x' },
  { label: '4^x - 5*2^x + 4 = 0', expression: '4^x - 5*2^x + 4 = 0', variable: 'x' },
  { label: '2^x > 8', expression: '2^x > 8', variable: 'x' },
];
