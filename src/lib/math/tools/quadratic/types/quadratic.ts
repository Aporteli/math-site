/** Exact rational number (always reduced, denominator > 0) */
export type Rational = {
  n: number;
  d: number;
};

export type Sign = -1 | 0 | 1;

/** Polynomial of degree ≤ 2: c0 + c1·x + c2·x² */
export type Polynomial = {
  c0: Rational;
  c1: Rational;
  c2: Rational;
};

export type QuadraticClassification =
  | 'two-real-distinct'
  | 'one-real-double'
  | 'two-complex'
  | 'not-quadratic'
  | 'identity'
  | 'inconsistent'
  | 'linear';

export type ExactRoot = {
  kind: 'rational' | 'radical' | 'complex';
  /** LaTeX exact form */
  exact: string;
  /** Optional decimal approximation */
  decimal?: string;
  /** Internal rational value when kind === 'rational' */
  value?: Rational;
};

export type QuadraticEquation = {
  variable: string;
  polynomial: Polynomial;
  a: Rational;
  b: Rational;
  c: Rational;
  standardForm: string;
  original: string;
};

export type ParabolaAnalysis = {
  vertex: { x: ExactRoot; y: ExactRoot };
  axisOfSymmetry: ExactRoot;
  yIntercept: ExactRoot;
  xIntercepts: ExactRoot[];
  direction: 'up' | 'down';
  extremaType: 'მინიმუმი' | 'მაქსიმუმი';
  domain: string;
  range: string;
  monotonicity: string;
};

export type QuadraticSolution = {
  equation: QuadraticEquation;
  discriminant: Rational;
  discriminantExact: string;
  classification: QuadraticClassification;
  roots: ExactRoot[];
  factorization: string | null;
  analysis: ParabolaAnalysis;
  /** Whether every root was verified by substitution */
  verified: boolean;
};

/** One pedagogical step */
export type SolutionStep = {
  title: string;
  explanation: string;
  latex?: string;
  latex2?: string;
};

export type MethodId = 'discriminant' | 'complete_square' | 'vieta' | 'factoring';

export type MethodSolution = {
  method: MethodId;
  title: string;
  steps: SolutionStep[];
  finalRoots: ExactRoot[];
};

export type AnalysisRow = {
  label: string;
  valueLatex: string;
  note?: string;
};