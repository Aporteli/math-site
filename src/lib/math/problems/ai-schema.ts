import { z } from "zod";
import { locales } from "@/i18n/config";
import { AI_MODEL_IDS, DEFAULT_AI_MODEL } from "./ai-models";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_INSTRUCTIONS,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
} from "./types";

export const AI_CHECK_MODES = ["verified", "plain"] as const;
export type AiCheckMode = (typeof AI_CHECK_MODES)[number];

export const generateDiverseProblemsSchema = z.object({
  request: z.string().trim().max(400).optional(),
  topic: z.enum(PROBLEM_TOPICS).optional(),
  difficulty: z.enum(PROBLEM_DIFFICULTIES).optional(),
  year: z.enum(PROBLEM_YEARS).optional(),
  count: z.number().int().min(1).max(8),
  locale: z.enum(locales),
  check: z.enum(AI_CHECK_MODES).default("verified"),
  model: z.enum(AI_MODEL_IDS).default(DEFAULT_AI_MODEL),
});

export type GenerateDiverseProblemsInput = z.infer<
  typeof generateDiverseProblemsSchema
>;

const variablesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(12),
      value: z.number().finite(),
    }),
  )
  .min(1)
  .max(12);

export const verifiedProblemDraftSchema = z.object({
  kind: z.string().trim().min(1).max(48),
  topic: z.string().trim().min(1).max(48),
  difficulty: z.enum(PROBLEM_DIFFICULTIES),
  year: z.enum(PROBLEM_YEARS),
  instructionId: z.enum(PROBLEM_INSTRUCTIONS),
  promptTex: z.string().trim().min(1).max(800),
  promptTemplate: z.string().trim().min(1).max(800).optional(),
  formula: z.string().trim().min(1).max(320),
  variables: variablesSchema,
});

export const plainProblemDraftSchema = z.object({
  kind: z.string().trim().min(1).max(48),
  topic: z.string().trim().min(1).max(48),
  difficulty: z.enum(PROBLEM_DIFFICULTIES),
  year: z.enum(PROBLEM_YEARS),
  instructionId: z.enum(PROBLEM_INSTRUCTIONS).default("evaluate"),
  promptTex: z.string().trim().min(1).max(4000),
  solutionTex: z.string().trim().min(1).max(12000),
});

export const verifiedProblemsResponseSchema = z.object({
  problems: z.array(verifiedProblemDraftSchema).min(1).max(12),
});

export const plainProblemsResponseSchema = z.object({
  problems: z.array(plainProblemDraftSchema).min(1).max(12),
});

export type VerifiedProblemDraft = z.infer<typeof verifiedProblemDraftSchema>;
export type PlainProblemDraft = z.infer<typeof plainProblemDraftSchema>;
export type AiProblemDraft = VerifiedProblemDraft | PlainProblemDraft;

const sharedDraftProperties = {
  kind: { type: "STRING" },
  topic: { type: "STRING" },
  difficulty: { type: "STRING", enum: [...PROBLEM_DIFFICULTIES] },
  year: { type: "STRING", enum: [...PROBLEM_YEARS] },
  instructionId: {
    type: "STRING",
    enum: [...PROBLEM_INSTRUCTIONS],
  },
  promptTex: { type: "STRING" },
} as const;

export const GEMINI_VERIFIED_SCHEMA = {
  type: "OBJECT",
  properties: {
    problems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ...sharedDraftProperties,
          promptTemplate: { type: "STRING" },
          formula: { type: "STRING" },
          variables: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                value: { type: "NUMBER" },
              },
              required: ["name", "value"],
            },
          },
        },
        required: [
          "kind",
          "topic",
          "difficulty",
          "year",
          "instructionId",
          "promptTex",
          "formula",
          "variables",
        ],
      },
    },
  },
  required: ["problems"],
} as const;

export const GEMINI_PLAIN_SCHEMA = {
  type: "OBJECT",
  properties: {
    problems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          ...sharedDraftProperties,
          solutionTex: { type: "STRING" },
        },
        required: [
          "kind",
          "topic",
          "difficulty",
          "year",
          "promptTex",
          "solutionTex",
        ],
      },
    },
  },
  required: ["problems"],
} as const;

export type DiverseGenerateError =
  | "unauthorized"
  | "missing_key"
  | "invalid_key"
  | "failed"
  | "none_verified"
  | "limit_exceeded"
  | "billing"
  | "timeout"
  | "bad_output";
