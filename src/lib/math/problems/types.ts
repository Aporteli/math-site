export const PROBLEM_TOPICS = [
  "algebra",
  "equations",
  "geometry",
  "functions",
  "percent",
  "calculus",
  "vectors",
  "combinatorics",
] as const;

export const GENERATOR_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const PROBLEM_DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
  "olympiad",
] as const;

export const PROBLEM_YEARS = ["7", "8", "9", "10", "11", "12"] as const;

export const PROBLEM_SOURCES = ["bank", "generated", "ai"] as const;

export const PROBLEM_CHECKS = ["verified", "unchecked"] as const;

export const PROBLEM_INSTRUCTIONS = [
  "solve",
  "evaluate",
  "findDerivative",
  "percentOf",
  "missingSide",
  "expand",
  "factor",
  "simplify",
] as const;

export type ProblemTopic = (typeof PROBLEM_TOPICS)[number];
export type GeneratorDifficulty = (typeof GENERATOR_DIFFICULTIES)[number];
export type ProblemDifficulty = (typeof PROBLEM_DIFFICULTIES)[number];

export function toGeneratorDifficulty(
  difficulty: ProblemDifficulty,
): GeneratorDifficulty {
  return difficulty === "olympiad" ? "hard" : difficulty;
}
export type ProblemYear = (typeof PROBLEM_YEARS)[number];
export type ProblemSource = (typeof PROBLEM_SOURCES)[number];
export type ProblemCheck = (typeof PROBLEM_CHECKS)[number];
export type ProblemInstructionId = (typeof PROBLEM_INSTRUCTIONS)[number];

export type ProblemTemplateId = string;

export interface BankProblem {
  id: string;
  templateId: ProblemTemplateId;
  topic: string;
  difficulty: ProblemDifficulty;
  year: ProblemYear;
  source: ProblemSource;
  instructionId: ProblemInstructionId;
  promptTex: string;
  solutionTex: string;
  seed?: number;
  /** Optional expression the graphing calculator can open later. */
  graphExpr?: string;
  /** Slug from the proposer (e.g. dot-product). Not shown as UI copy. */
  kind?: string;
  /** math.js formula the CAS used; never trust a model-supplied answer. */
  formula?: string;
  variables?: Record<string, number>;
  /** promptTex with `{{name}}` slots so variants can swap numbers locally. */
  promptTemplate?: string;
}

export interface ProblemFilters {
  query: string;
  topic: string | "all";
  difficulty: ProblemDifficulty | "all";
  year: ProblemYear | "all";
  source: ProblemSource | "all";
  check: ProblemCheck | "all";
}

export const EMPTY_PROBLEM_FILTERS: ProblemFilters = {
  query: "",
  topic: "all",
  difficulty: "all",
  year: "all",
  source: "all",
  check: "all",
};
