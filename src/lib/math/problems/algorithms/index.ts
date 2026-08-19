import { locales } from "@/i18n/config";
import { z } from "zod";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  toGeneratorDifficulty,
  type BankProblem,
  type ProblemDifficulty,
  type ProblemTopic,
  type ProblemYear,
} from "../types";
import { algebraAlgorithms } from "./algebra";
import { calculusAlgorithms } from "./calculus";
import { combinatoricsAlgorithms } from "./combinatorics";
import { equationsAlgorithms } from "./equations";
import { functionsAlgorithms } from "./functions";
import { geometryAlgorithms } from "./geometry";
import { percentAlgorithms } from "./percent";
import {
  classifyTemplateGenerateFilter,
  collectTemplateGenerateLabels,
  compileTemplate,
  matchingTemplateCount,
} from "../templates/engine";
import { templateAlgorithms } from "../templates";
import { mulberry32, pick, shuffle } from "./rng";
import type { ProblemAlgorithm } from "./types";
import { vectorsAlgorithms } from "./vectors";

export const generateProblemsSchema = z.object({
  topic: z.enum(PROBLEM_TOPICS).optional(),
  kind: z.string().min(1).max(64).optional(),
  difficulty: z.enum(PROBLEM_DIFFICULTIES).optional(),
  year: z.enum(PROBLEM_YEARS).optional(),
  count: z.number().int().min(1).max(12),
  seed: z.number().int().optional(),
  locale: z.enum(locales).optional(),
  anchorExample: z.boolean().optional(),
});

export type GenerateProblemsInput = z.infer<typeof generateProblemsSchema>;

/** Add a topic file and spread it here to grow the library. */
export const PROBLEM_ALGORITHMS: readonly ProblemAlgorithm[] = [
  ...algebraAlgorithms,
  ...templateAlgorithms,
  ...equationsAlgorithms,
  ...geometryAlgorithms,
  ...functionsAlgorithms,
  ...percentAlgorithms,
  ...calculusAlgorithms,
  ...vectorsAlgorithms,
  ...combinatoricsAlgorithms,
];

export interface ProblemAlgorithmOption {
  id: string;
  topic: ProblemTopic;
}

export const PROBLEM_ALGORITHM_OPTIONS: readonly ProblemAlgorithmOption[] =
  PROBLEM_ALGORITHMS.map(({ id, topic }) => ({ id, topic }));

export const ALGORITHM_KIND_GROUP_IDS = [
  "foundational-pre-algebra",
] as const;

export type AlgorithmKindGroupId = (typeof ALGORITHM_KIND_GROUP_IDS)[number];

export const ALGORITHM_KIND_GROUPS: readonly {
  id: AlgorithmKindGroupId;
  topic: ProblemTopic;
  kindIds: readonly string[];
}[] = [
  {
    id: "foundational-pre-algebra",
    topic: "algebra",
    kindIds: [
      "order-of-operations",
      "numerical-simplification",
      "linear-equations-inequalities",
      "linear-one-step",
      "quadratic-equations-inequalities",
      "higher-degree-equations-inequalities",
      "rational-equations-inequalities",
      "radical-equations-inequalities",
      "absolute-value-parametric",
      "domain-range",
      "composition-of-functions",
      "inverse-functions",
      "graphical-transformations",
      "polynomial-functions",
      "exponential-functions",
      "logarithmic-functions",
      "arithmetic-progressions",
      "geometric-progressions",
      "infinite-geometric-series",
      "root-finding-algorithms",
      "linear-lcd-dynamic",
      "binomial-expansion",
      "polynomial-simplification",
      "polynomial-factoring",
      "synthetic-division",
      "polynomial-interpolation",
      "proportions-ratios",
      "word-problems",
      "basic-graphing",
    ],
  },
];

export function algorithmOptionsForTopic(
  topic: ProblemTopic,
): ProblemAlgorithmOption[] {
  return PROBLEM_ALGORITHM_OPTIONS.filter((option) => option.topic === topic);
}

export function groupedKindsForTopic(topic: ProblemTopic): Array<{
  groupId: AlgorithmKindGroupId | null;
  kinds: ProblemAlgorithmOption[];
}> {
  const options = algorithmOptionsForTopic(topic);
  const placed = new Set<string>();
  const groups: Array<{
    groupId: AlgorithmKindGroupId | null;
    kinds: ProblemAlgorithmOption[];
  }> = [];

  for (const group of ALGORITHM_KIND_GROUPS) {
    if (group.topic !== topic) continue;
    const kinds = group.kindIds.flatMap((id) => {
      const option = options.find((entry) => entry.id === id);
      return option ? [option] : [];
    });
    if (kinds.length === 0) continue;
    for (const kind of kinds) placed.add(kind.id);
    groups.push({ groupId: group.id, kinds });
  }

  const rest = options.filter((option) => !placed.has(option.id));
  if (rest.length > 0) groups.push({ groupId: null, kinds: rest });
  return groups;
}

const DEFAULT_YEAR: Record<
  ProblemTopic,
  Record<ProblemDifficulty, ProblemYear>
> = {
  algebra: { easy: "7", medium: "8", hard: "11", olympiad: "12" },
  equations: { easy: "8", medium: "9", hard: "10", olympiad: "12" },
  geometry: { easy: "8", medium: "9", hard: "10", olympiad: "12" },
  functions: { easy: "8", medium: "9", hard: "11", olympiad: "12" },
  percent: { easy: "7", medium: "8", hard: "9", olympiad: "11" },
  calculus: { easy: "11", medium: "11", hard: "12", olympiad: "12" },
  vectors: { easy: "9", medium: "10", hard: "11", olympiad: "12" },
  combinatorics: { easy: "8", medium: "10", hard: "11", olympiad: "12" },
};

function matchingAlgorithms(input: GenerateProblemsInput): ProblemAlgorithm[] {
  return PROBLEM_ALGORITHMS.filter((algorithm) => {
    // თემის შემოწმება
    if (input.topic && algorithm.topic !== input.topic) return false;
    if (input.kind && algorithm.id !== input.kind) return false;
    
    // სირთულის მკაცრი შემოწმება
    if (input.difficulty) {
      const listed = algorithm.difficulties.includes(input.difficulty);
      const olympiadAsHard =
        input.difficulty === "olympiad" &&
        algorithm.difficulties.includes("hard");
      if (!listed && !olympiadAsHard) return false;
    }
    
    // წლის მკაცრი შემოწმება (თუ მითითებულია)
    if (
      input.year &&
      algorithm.years &&
      !algorithm.years.includes(input.year)
    ) {
      return false;
    }

    return true;
  });
}

function takeDiverse(
  pool: readonly ProblemAlgorithm[],
  count: number,
  rng: () => number,
): ProblemAlgorithm[] {
  const picked: ProblemAlgorithm[] = [];
  let deck = shuffle(rng, pool);
  let index = 0;
  while (picked.length < count) {
    if (index >= deck.length) {
      deck = shuffle(rng, pool);
      index = 0;
    }
    picked.push(deck[index]!);
    index += 1;
  }
  return picked;
}

export function generateProblems(raw: GenerateProblemsInput): BankProblem[] {
  const input = generateProblemsSchema.parse(raw);
  const pool = matchingAlgorithms(input);
  if (pool.length === 0) return [];

  const root =
    input.seed ?? Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
  const pickRng = mulberry32(root);
  const algorithms = takeDiverse(pool, input.count, pickRng);
  const problems: BankProblem[] = [];

  for (let i = 0; i < algorithms.length; i += 1) {
    problems.push(emitGenerated(algorithms[i]!, input, root + i * 9973));
  }

  return problems;
}

function emitGenerated(
  algorithm: ProblemAlgorithm,
  input: GenerateProblemsInput,
  seed: number,
  pickOpts?: {
    variantIndex?: number;
    variantId?: string;
    skipMatchFilter?: boolean;
  },
): BankProblem {
  const rng = mulberry32(seed);
  const requested = input.difficulty;
  const requestedFits =
    requested != null &&
    (algorithm.difficulties.includes(requested) ||
      (requested === "olympiad" && algorithm.difficulties.includes("hard")));
  const difficulty: ProblemDifficulty = requestedFits
    ? requested
    : pick(rng, algorithm.difficulties);
  const year =
    input.year && (!algorithm.years || algorithm.years.includes(input.year))
      ? input.year
      : algorithm.years && algorithm.years.length > 0
        ? pick(rng, algorithm.years)
        : DEFAULT_YEAR[algorithm.topic][difficulty];
  const draft = algorithm.generate({
    rng,
    difficulty: toGeneratorDifficulty(difficulty),
    year,
    seed,
    locale: input.locale,
    anchorExample: input.anchorExample,
    variantIndex: pickOpts?.variantIndex,
    variantId: pickOpts?.variantId,
    filterDifficulty: input.difficulty,
    filterYear: input.year,
    skipMatchFilter: pickOpts?.skipMatchFilter,
  });
  return {
    id: `gen-${algorithm.id}-${seed}`,
    templateId: algorithm.id,
    topic: algorithm.topic,
    difficulty,
    year,
    source: "generated",
    kind: algorithm.id,
    seed,
    ...draft,
  };
}

/** Cycle through every family skeleton. Offset comes from the batch seed. */
export function batchVariantIndex(
  index: number,
  variantCount: number,
  offset = 0,
) {
  if (variantCount <= 1) return 0;
  const start = ((offset % variantCount) + variantCount) % variantCount;
  return (start + index) % variantCount;
}

export type GenerateFromTemplateOptions = {
  variantId?: string;
  /** Resample one skeleton only (variants of the selected card). */
  pinVariant?: boolean;
  /** Pin by index when the skeleton has no id. */
  variantIndex?: number;
};

/** Compile a JSON family in memory and sample `count` problems from it. */
export function generateFromTemplate(
  rawTemplate: unknown,
  raw: GenerateProblemsInput,
  options?: GenerateFromTemplateOptions,
): BankProblem[] {
  const algorithm = compileTemplate(rawTemplate);
  const input = generateProblemsSchema.parse({
    ...raw,
    topic: algorithm.topic,
    kind: algorithm.id,
  });
  const skipMatchFilter = Boolean(options?.pinVariant || options?.variantId);
  const root =
    input.seed ?? Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
  let variantCount = algorithm.variantCount ?? 1;
  if (variantCount === 0) return [];
  if (!skipMatchFilter) {
    variantCount = matchingTemplateCount(rawTemplate, {
      difficulty: input.difficulty,
      year: input.year,
    });
    if (variantCount === 0) return [];
  }
  const problems: BankProblem[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const variantIndex = options?.variantId
      ? undefined
      : options?.variantIndex != null
        ? options.variantIndex
        : options?.pinVariant
          ? 0
          : batchVariantIndex(i, variantCount, root);
    try {
      problems.push(
        emitGenerated(algorithm, input, root + i * 9973, {
          variantIndex,
          variantId: options?.variantId,
          skipMatchFilter,
        }),
      );
    } catch (error) {
      if (error instanceof Error && error.message === "NO_TEMPLATE_MATCH") {
        return [];
      }
      throw error;
    }
  }
  return problems;
}

export { classifyTemplateGenerateFilter, collectTemplateGenerateLabels };