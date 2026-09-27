export interface LogSolution {
    latex: string;
    numeric: number;
  }
  
  export interface LogSolveResult {
    mode: 'solve';
    identity: boolean;
    inputLatex: string;
    domainLatex?: string;
    solutions?: LogSolution[];
    rejected?: LogSolution[];
  }
  
  export interface LogSimplifyResult {
    mode: 'simplify';
    inputLatex: string;
    simplifiedLatex: string;
  }
  
  export type LogResult = LogSolveResult | LogSimplifyResult;
  
  export const LOG_HISTORY_KEY = 'mathlab.logarithm.history';
  
  export interface LogHistoryItem {
    expression: string;
    variable: string;
  }
  
  export const LOG_VARIABLES = ['x', 'y', 'z', 't'] as const;
  
  export const LOG_EXAMPLES: { label: string; expression: string; variable: string }[] = [
    { label: 'log(100)', expression: 'log(100)', variable: 'x' },
    { label: 'log₂(8) + log₂(4)', expression: 'log_2(8) + log_2(4)', variable: 'x' },
    { label: 'log(x·y) + log(x/y)', expression: 'log(x*y) + log(x/y)', variable: 'x' },
    { label: 'ln(e²)', expression: 'ln(e^2)', variable: 'x' },
    { label: 'log₂(x − 1) = 3', expression: 'log_2(x - 1) = 3', variable: 'x' },
    { label: 'log(x) + log(x − 1) = log(6)', expression: 'log(x) + log(x - 1) = log(6)', variable: 'x' },
    { label: 'log₂(x² − 1) − log₂(x − 1) = 2', expression: 'log_2(x^2 - 1) - log_2(x - 1) = 2', variable: 'x' },
    { label: 'log₃(81) = x', expression: 'log_3(81) = x', variable: 'x' },
  ];