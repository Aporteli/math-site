import type { Locale } from "@/i18n/config";
import type {
  GeneratorDifficulty,
  ProblemDifficulty,
  ProblemInstructionId,
  ProblemTopic,
  ProblemYear,
} from "../types";

export interface AlgorithmContext {
  rng: () => number;
  difficulty: GeneratorDifficulty;
  year: ProblemYear;
  seed: number;
  locale?: Locale;
  /** First sample should reuse `variant.example` when it fits the ranges. */
  anchorExample?: boolean;
}

export interface AlgorithmDraft {
  instructionId: ProblemInstructionId;
  promptTex: string;
  solutionTex: string;
  graphExpr?: string;
  formula?: string;
  variables?: Record<string, number>;
  promptTemplate?: string;
}

/** Uniform payload: unused CAS/graph fields are empty, never omitted. */
export type GeneratedProblem = {
  instructionId: ProblemInstructionId;
  promptTex: string;
  solutionTex: string;
  graphExpr: string;
  formula: string;
  variables: Record<string, number>;
  promptTemplate: string;
};

export function problem(
  draft: {
    instructionId: ProblemInstructionId;
    promptTex: string;
    solutionTex: string;
    graphExpr?: string;
    formula?: string;
    variables?: Record<string, number>;
    promptTemplate?: string;
  },
): GeneratedProblem {
  return {
    graphExpr: "",
    formula: "",
    variables: {},
    promptTemplate: "",
    ...draft,
  };
}

/**
 * One deterministic generator. Add a new file under `algorithms/` and
 * register it in `index.ts` — the lab samples across matching entries.
 */
export interface ProblemAlgorithm {
  id: string;
  topic: ProblemTopic;
  difficulties: readonly ProblemDifficulty[];
  years?: readonly ProblemYear[];
  generate: (ctx: AlgorithmContext) => AlgorithmDraft;
}
