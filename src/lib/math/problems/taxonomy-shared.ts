import { z } from "zod";
import type { Locale } from "@/i18n/config";

export const TAXONOMY_LEVELS = [
  "branch",
  "topic",
  "subtopic",
  "concept",
] as const;

export type TaxonomyLevel = (typeof TAXONOMY_LEVELS)[number];

export type TaxonomyNodeDto = {
  id: string;
  level: TaxonomyLevel;
  slug: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  parentId: string | null;
  sortOrder: number;
};

export const LEVEL_PARENT: Record<TaxonomyLevel, TaxonomyLevel | null> = {
  branch: null,
  topic: "branch",
  subtopic: "topic",
  concept: "subtopic",
};

export function taxonomyLabel(node: TaxonomyNodeDto, locale: Locale): string {
  if (locale === "en") return node.nameEn;
  if (locale === "ru") return node.nameRu;
  return node.nameKa;
}

export function childrenOf(
  nodes: TaxonomyNodeDto[],
  parentId: string | null,
  level: TaxonomyLevel,
): TaxonomyNodeDto[] {
  return nodes
    .filter((node) => node.level === level && node.parentId === parentId)
    .sort(
      (a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn),
    );
}

export const taxonomyUpsertSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  level: z.enum(TAXONOMY_LEVELS),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "slug"),
  nameKa: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  nameRu: z.string().trim().min(1).max(120),
  parentId: z.string().trim().min(1).max(64).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export type TaxonomyUpsertInput = z.infer<typeof taxonomyUpsertSchema>;
