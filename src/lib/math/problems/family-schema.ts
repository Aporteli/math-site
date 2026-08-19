import { z } from "zod";
import { locales } from "@/i18n/config";
import { PROBLEM_DIFFICULTIES, PROBLEM_TOPICS, PROBLEM_YEARS } from "./types";

export const saveFamilySchema = z.object({
  json: z.string().trim().min(2).max(1_500_000),
  id: z.string().trim().min(1).max(128).optional(),
  title: z.string().trim().min(1).max(80).optional(),
  topic: z.enum(PROBLEM_TOPICS).optional(),
});

export const createFamilyKindSchema = z.object({
  title: z.string().trim().min(1).max(80),
  topic: z.enum(PROBLEM_TOPICS),
  parentId: z.string().trim().min(1).max(128).optional(),
});

export const familyIdSchema = z.string().trim().min(1).max(128);

export const generateFromFamilySchema = z.object({
  id: z.string().trim().min(1).max(128),
  count: z.number().int().min(1).max(12),
  difficulty: z.enum(PROBLEM_DIFFICULTIES).optional(),
  year: z.enum(PROBLEM_YEARS).optional(),
  locale: z.enum(locales).optional(),
});

export type SaveFamilyInput = z.infer<typeof saveFamilySchema>;
export type CreateFamilyKindInput = z.infer<typeof createFamilyKindSchema>;
export type GenerateFromFamilyInput = z.infer<typeof generateFromFamilySchema>;
