export interface IneqStep {
    title: string;
    explanation: string;
    latex: string;
  }
  
  export interface IneqInterval {
    startOpen: boolean;
    endOpen: boolean;
    startLatex: string;
    endLatex: string;
    startNum: number | null;
    endNum: number | null;
    isPoint: boolean;
  }
  
  export interface IneqResult {
    type: 'linear' | 'quadratic' | 'absolute' | 'other';
    solutionLatex: string;
    intervalNotation: string;
    intervals: IneqInterval[];
    criticalPoints: string[];
    criticalPointsNumeric: number[];
    steps: IneqStep[];
  }
  
  export const INEQ_HISTORY_KEY = 'pinf.inequality.history';
  
  export interface IneqHistoryItem {
    inequality: string;
    variable: string;
  }
  
  export const INEQ_VARIABLES = ['x', 'y', 'z', 't'] as const;
  
  export const INEQ_EXAMPLES: {
    label: string;
    inequality: string;
    variable: string;
  }[] = [
    { label: '2x + 3 > 7', inequality: '2x + 3 > 7', variable: 'x' },
    { label: '−3x + 1 ≤ 7', inequality: '-3x + 1 <= 7', variable: 'x' },
    { label: 'x² − 5x + 6 < 0', inequality: 'x^2 - 5x + 6 < 0', variable: 'x' },
    { label: 'x² − 5x + 6 > 0', inequality: 'x^2 - 5x + 6 > 0', variable: 'x' },
    { label: '|x − 2| < 3', inequality: '|x - 2| < 3', variable: 'x' },
    { label: '|2x + 1| ≥ 5', inequality: '|2x + 1| >= 5', variable: 'x' },
    { label: 'x² + 1 > 0', inequality: 'x^2 + 1 > 0', variable: 'x' },
  ];