export interface RearrangeStep {
  op: string;
  latex: string;
}

export interface RearrangeSolution {
  latex: string;
  numeric: number | null;
}

export interface RearrangeResult {
  variable: string;
  steps: RearrangeStep[];
  solutions: RearrangeSolution[];
}

export const REARRANGE_HISTORY_KEY = 'mathlab.rearrange.history';

export interface RearrangeInput {
  expression: string;
  variable: string;
}

export const REARRANGE_EXAMPLES: (RearrangeInput & { label: string })[] = [
  { label: 'A = πr²', expression: 'A = pi*r**2', variable: 'r' },
  { label: 'F = ma', expression: 'F = m*a', variable: 'a' },
  { label: 'v = u + at', expression: 'v = u + a*t', variable: 't' },
  { label: '1/f = 1/u + 1/v', expression: '1/f = 1/u + 1/v', variable: 'v' },
  { label: 'V = 4/3 πr³', expression: 'V = 4/3*pi*r**3', variable: 'r' },
];
