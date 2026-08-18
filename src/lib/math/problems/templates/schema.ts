import { z } from "zod";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_INSTRUCTIONS,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
} from "../types";

const nameSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,23}$/, "invalid parameter name");

const intRangeSchema = z
  .tuple([z.number().int(), z.number().int()])
  .refine(([min, max]) => min <= max, { message: "int min > max" });

export const intParamSchema = z.object({
  int: intRangeSchema,
  nonzero: z.boolean().optional(),
  exclude: z.array(z.number().int()).max(24).optional(),
});

export const pickParamSchema = z.object({
  pick: z
    .array(z.union([z.number().finite(), z.string().min(1).max(12)]))
    .min(1)
    .max(48),
});

export const leafParamSchema = z.union([intParamSchema, pickParamSchema]);

export const paramSpecSchema = z.union([
  leafParamSchema,
  z.object({
    byDifficulty: z
      .object({
        easy: leafParamSchema.optional(),
        medium: leafParamSchema.optional(),
        hard: leafParamSchema.optional(),
        olympiad: leafParamSchema.optional(),
      })
      .refine(
        (value) =>
          value.easy != null ||
          value.medium != null ||
          value.hard != null ||
          value.olympiad != null,
        { message: "byDifficulty is empty" },
      ),
  }),
]);

export const templateVariantSchema = z
  .object({
    id: z.string().trim().min(1).max(48).optional(),
    params: z.record(nameSchema, paramSpecSchema).default({}),
    derived: z
      .record(nameSchema, z.string().trim().min(1).max(320))
      .default({}),
    constraints: z.array(z.string().trim().min(1).max(320)).max(24).default([]),
    prompt: z.string().trim().min(1).max(4000),
    solution: z.string().trim().min(1).max(8000).optional(),
    solutionSteps: z.array(z.string().trim().min(1).max(1600)).max(24).optional(),
    formula: z.string().trim().min(1).max(320).optional(),
    variableNames: z.array(nameSchema).max(12).optional(),
    example: z
      .record(
        nameSchema,
        z.union([z.number().finite(), z.string().min(1).max(12)]),
      )
      .optional(),
  })
  .refine(
    (variant) =>
      Boolean(variant.solution) ||
      (variant.solutionSteps != null && variant.solutionSteps.length > 0),
    { message: "variant needs solution or solutionSteps" },
  )
  .refine(
    (variant) =>
      Object.keys(variant.params).every((name) => !(name in variant.derived)),
    { message: "param and derived names collide" },
  );

export const problemTemplateSchema = z.object({
  id: z.string().trim().min(1).max(64),
  topic: z.enum(PROBLEM_TOPICS),
  difficulties: z.array(z.enum(PROBLEM_DIFFICULTIES)).min(1),
  years: z.array(z.enum(PROBLEM_YEARS)).min(1),
  instructionId: z.enum(PROBLEM_INSTRUCTIONS),
  variants: z.array(templateVariantSchema).min(1).max(24),
});

export type IntParamSpec = z.infer<typeof intParamSchema>;
export type PickParamSpec = z.infer<typeof pickParamSchema>;
export type LeafParamSpec = z.infer<typeof leafParamSchema>;
export type ParamSpec = z.infer<typeof paramSpecSchema>;
export type TemplateVariant = z.infer<typeof templateVariantSchema>;
export type ProblemTemplate = z.infer<typeof problemTemplateSchema>;
