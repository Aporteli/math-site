export interface PolyStep {
    title: string;
    explanation: string;
    latex: string;
  }
  
  export interface DivisionResult {
    quotient_latex: string;
    remainder_latex: string;
  }
  
  export interface PolyResult {
    expanded_latex: string;
    factored_latex: string;
    degree: number;
    leading_coeff: string;
    roots: string[];
    operations: {
      factor?: PolyStep[];
      roots?: PolyStep[];
      division?: PolyStep[];
    };
    division?: DivisionResult;
  }
  
  export const POLYNOMIAL_HISTORY_KEY = 'mathlab.polynomial.history';
  
  export interface PolynomialHistoryItem {
    expression: string;
    variable: string;
    divisor: string;
  }
  
  export const POLY_VARIABLES = ['x', 'y', 'z', 't'] as const;
  
  export const POLY_EXAMPLES: {
    label: string;
    expression: string;
    divisor: string;
    variable: string;
  }[] = [
    { label: 'x³ − 6x² + 11x − 6', expression: 'x^3 - 6x^2 + 11x - 6', divisor: 'x - 1', variable: 'x' },
    { label: 'x² − 5x + 6', expression: 'x^2 - 5x + 6', divisor: 'x - 2', variable: 'x' },
    { label: 'x³ − 1', expression: 'x^3 - 1', divisor: 'x - 1', variable: 'x' },
    { label: 'x⁴ − 1', expression: 'x^4 - 1', divisor: 'x^2 - 1', variable: 'x' },
    { label: '2x³ + 3x² − 4x − 5', expression: '2x^3 + 3x^2 - 4x - 5', divisor: 'x + 1', variable: 'x' },
  ];