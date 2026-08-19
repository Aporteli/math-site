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
  /** Cycle family skeletons in a batch so Generate is not one stem with new digits. */
  variantIndex?: number;
  /** Pin generation to one skeleton (same card, new numbers). */
  variantId?: string;
  /** Exact family-card filter. Omitted means any difficulty. */
  filterDifficulty?: ProblemDifficulty;
  /** Exact family-card filter. Omitted means any year. */
  filterYear?: ProblemYear;
  /** Resample / pin: do not apply generate-page difficulty/year filters. */
  skipMatchFilter?: boolean;
}

export interface AlgorithmDraft {
  instructionId: ProblemInstructionId;
  promptTex: string;
  solutionTex: string;
  graphExpr?: string;
  formula?: string;
  variables?: Record<string, number>;
  promptTemplate?: string;
  /** Family slug, or `slug/skeleton` so variants can resample this card. */
  kind?: string;
  /** Variant label when the JSON card set year/difficulty. */
  difficulty?: ProblemDifficulty;
  year?: ProblemYear;
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
  /** JSON families only — how many stems the compiled template has. */
  variantCount?: number;
  generate: (ctx: AlgorithmContext) => AlgorithmDraft;
}
