export type VarCount = 2 | 3;

export type SolveMethod = 'substitution' | 'elimination' | 'matrix' | 'nonlinear';

export interface SolutionStep {
  title: string;
  explanation: string;
  latex: string;
}

export interface MethodSolution {
  method: SolveMethod;
  label: string;
  steps: SolutionStep[];
}

export interface LinearInfo {
  matrix_A: string[][];
  vector_b: string[];
  determinant: string;
  solution: Record<string, string>;
}

export interface SolveResponse {
  solutions: Record<string, string>[];
  is_linear: boolean;
  linear: LinearInfo | null;
  methods: MethodSolution[];
  status: 'unique' | 'infinite' | 'inconsistent'; // ← ეს დაამატე
}

export interface Preset {
  label: string;
  size: VarCount;
  equations: string[];
}

export const PRESETS_SYSTEMS: Preset[] = [
  { label: '2×2 წრფივი', size: 2, equations: ['2x + 3y = 8', 'x - y = -1'] },
  { label: '2×2 არაწრფივი', size: 2, equations: ['x^2 + y = 5', 'x - y = 1'] },
  {
    label: '3×3 წრფივი',
    size: 3,
    equations: ['x + y + z = 6', '2x - y + z = 3', 'x + 2y - z = 2'],
  },
  {
    label: '3×3 შერეული',
    size: 3,
    equations: ['x + y + z = 6', 'x - y = 1', 'y - z = 2'],
  },
];

export const METHOD_LABELS: Record<SolveMethod, string> = {
  substitution: 'ჩასმა',
  elimination: 'შეკრება',
  matrix: 'მატრიცა',
  nonlinear: 'არაწრფივი',
};

export const HISTORY_KEY = 'mathlab.system-solver.history';

export interface HistoryItem {
  equations: string[];
  variables: string[];
  solutions: Record<string, string>[];
}
