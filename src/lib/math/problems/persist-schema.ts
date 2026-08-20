import { z } from "zod";
import {
  PROBLEM_COLLECTIONS,
  PROBLEM_DIFFICULTIES,
  PROBLEM_INSTRUCTIONS,
  PROBLEM_SOURCES,
  PROBLEM_YEARS,
  type BankProblem,
} from "./types";

export const persistProblemSchema = z.object({
  clientId: z.string().trim().min(1).max(128),
  templateId: z.string().trim().min(1).max(64),
  topic: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[\p{L}\p{N}-]+$/u),
  difficulty: z.enum(PROBLEM_DIFFICULTIES),
  year: z.enum(PROBLEM_YEARS).optional(),
  source: z.enum(PROBLEM_SOURCES),
  collection: z.enum(PROBLEM_COLLECTIONS).default("bank"),
  originId: z.string().trim().min(1).max(128).optional(),
  instructionId: z.enum(PROBLEM_INSTRUCTIONS),
  promptTex: z.string().trim().min(1).max(4000),
  solutionTex: z.string().trim().min(1).max(12000),
  seed: z.number().int().min(-2147483648).max(2147483647).optional(),
  graphExpr: z.string().trim().max(500).optional(),
  kind: z.string().trim().max(80).optional(),
  formula: z.string().trim().max(400).optional(),
  variables: z.record(z.string(), z.number().finite()).optional(),
  promptTemplate: z.string().trim().max(4000).optional(),
  branchId: z.string().trim().min(1).max(64).optional(),
  topicNodeId: z.string().trim().min(1).max(64).optional(),
  subtopicId: z.string().trim().min(1).max(64).optional(),
  conceptId: z.string().trim().min(1).max(64).optional(),
});

export const persistProblemsSchema = z
  .array(persistProblemSchema)
  .min(1)
  .max(24);

export const lessonSetIdsSchema = z.array(z.string().trim().min(1).max(80)).max(48);

export type PersistProblemInput = z.infer<typeof persistProblemSchema>;

export function isCatalogSeedId(id: string) {
  return id.startsWith("bank-");
}

export function isUnsavedId(id: string) {
  return /^(gen-|ai-|var-|custom-)/.test(id);
}

function toSeed(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return value | 0;
}

export function toPersistInput(
  problem: BankProblem,
  collection: "bank" | "lab" = "bank",
): PersistProblemInput {
  const parsed = persistProblemSchema.safeParse({
    clientId: problem.id.slice(0, 128),
    templateId: problem.templateId,
    topic: problem.topic,
    difficulty: problem.difficulty,
    year: problem.year,
    source: problem.source,
    collection: problem.collection ?? collection,
    originId: problem.originId?.slice(0, 128) || undefined,
    instructionId: problem.instructionId,
    promptTex: problem.promptTex,
    solutionTex: problem.solutionTex,
    seed: toSeed(problem.seed),
    graphExpr: problem.graphExpr || undefined,
    kind: problem.kind?.slice(0, 80) || undefined,
    formula: problem.formula || undefined,
    variables: problem.variables,
    promptTemplate: problem.promptTemplate || undefined,
    branchId: problem.branchId || undefined,
    topicNodeId: problem.topicNodeId || undefined,
    subtopicId: problem.subtopicId || undefined,
    conceptId: problem.conceptId || undefined,
  });
  if (!parsed.success) {
    console.error("invalid persist payload", parsed.error.flatten());
    throw new Error("invalid_problem");
  }
  return parsed.data;
}
