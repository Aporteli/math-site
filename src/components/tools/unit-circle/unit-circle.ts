export interface TrigValue {
  name: string;
  latex: string | null;
  numeric: number | null;
  undefined: boolean;
}

export interface AngleResult {
  mode: 'angle';
  inputLatex: string;
  degreesLatex: string;
  radiansLatex: string;
  values: TrigValue[];
}

export interface CircleSimplifyResult {
  mode: 'simplify';
  inputLatex: string;
  simplifiedLatex: string;
  expandedLatex?: string | null;
  degreesLatex?: string | null;
  radiansLatex?: string | null;
}

export interface CircleSolution {
  latex: string;
  numeric: number | null;
  degreesLatex?: string | null;
}

export interface CircleSolveResult {
  mode: 'solve';
  identity: boolean;
  inputLatex: string;
  solutions?: CircleSolution[];
  solutionLatex?: string | null;
}

export type CircleResult = AngleResult | CircleSimplifyResult | CircleSolveResult;

export const CIRCLE_HISTORY_KEY = 'mathlab.unitCircle.history';

export type AngleUnit = 'deg' | 'rad';

export interface CircleHistoryItem {
  expression: string;
  variable: string;
  unit: AngleUnit;
}

export const CIRCLE_VARIABLES = ['x', 'y', 't'] as const;

export const CIRCLE_EXAMPLES: { label: string; expression: string; variable: string; unit: AngleUnit }[] = [
  { label: '30°', expression: '30', variable: 'x', unit: 'deg' },
  { label: 'π/6', expression: 'pi/6', variable: 'x', unit: 'rad' },
  { label: '15°', expression: '15', variable: 'x', unit: 'deg' },
  { label: '22.5°', expression: '22.5', variable: 'x', unit: 'deg' },
  { label: 'sin(π/5)', expression: 'sin(pi/5)', variable: 'x', unit: 'rad' },
  { label: 'sin²x + cos²x', expression: 'sin(x)^2 + cos(x)^2', variable: 'x', unit: 'rad' },
  { label: 'sin(2x)', expression: 'sin(2*x)', variable: 'x', unit: 'rad' },
  { label: 'sin(x) = 1/2', expression: 'sin(x) = 1/2', variable: 'x', unit: 'rad' },
  { label: 'acos(√2/2)', expression: 'acos(sqrt(2)/2)', variable: 'x', unit: 'rad' },
];
