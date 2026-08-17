import { z } from "zod";
import { locales } from "@/i18n/config";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_INSTRUCTIONS,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
} from "./types";

export const generateDiverseProblemsSchema = z.object({
  request: z.string().trim().max(400).optional(),
  topic: z.enum(PROBLEM_TOPICS),
  difficulty: z.enum(PROBLEM_DIFFICULTIES),
  year: z.enum(PROBLEM_YEARS),
  count: z.number().int().min(1).max(8),
  locale: z.enum(locales),
});

export type GenerateDiverseProblemsInput = z.infer<
  typeof generateDiverseProblemsSchema
>;

export const aiProblemDraftSchema = z.object({
  kind: z.string().trim().min(1).max(48),
  instructionId: z.enum(PROBLEM_INSTRUCTIONS),
  promptTex: z.string().trim().min(1).max(500),
  promptTemplate: z.string().trim().min(1).max(500).optional(),
  formula: z.string().trim().min(1).max(200),
  variables: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(12),
        value: z.number().finite(),
      }),
    )
    .min(1)
    .max(12),
});

export const aiProblemsResponseSchema = z.object({
  problems: z.array(aiProblemDraftSchema).min(1).max(12),
});

export type AiProblemDraft = z.infer<typeof aiProblemDraftSchema>;

export const GEMINI_PROBLEM_SCHEMA = {
  type: "OBJECT",
  properties: {
    problems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          kind: { type: "STRING" },
          instructionId: {
            type: "STRING",
            enum: [...PROBLEM_INSTRUCTIONS],
          },
          promptTex: { type: "STRING" },
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

export type DiverseGenerateError =
  | "unauthorized"
  | "missing_key"
  | "failed"
  | "none_verified";
