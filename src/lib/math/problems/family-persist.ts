import type { Prisma, ProblemFamily as ProblemFamilyRow } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { slugFromTitle, stubFamilyTemplate } from "./family-kind";
import { parseProblemTemplate, parseTeacherJson } from "./templates/adapt";
import type { ProblemTemplate } from "./templates/schema";
import {
  PROBLEM_TOPICS,
  type ProblemDifficulty,
  type ProblemTopic,
  type ProblemYear,
} from "./types";

export interface SavedProblemFamily {
  id: string;
  slug: string;
  title: string;
  topic: string;
  parentId: string | null;
  instructionId: string;
  difficulties: ProblemDifficulty[];
  years: ProblemYear[];
  variantCount: number;
  json: string;
  updatedAt: string;
}

export type FamilyPersistError = "invalid" | "slug_taken" | "not_found" | "failed";

function asUnknownJson(value: Prisma.JsonValue): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

export function prettyTemplateJson(template: ProblemTemplate): string {
  return `${JSON.stringify(template, null, 2)}\n`;
}

function asTopic(value: string): ProblemTopic {
  if ((PROBLEM_TOPICS as readonly string[]).includes(value)) {
    return value as ProblemTopic;
  }
  return "algebra";
}

function bindTemplate(
  template: ProblemTemplate,
  slug: string,
  topic: string,
): ProblemTemplate {
  return { ...template, id: slug, topic: asTopic(topic) };
}

function rowToFamily(row: ProblemFamilyRow): SavedProblemFamily | null {
  const parsed = parseProblemTemplate(asUnknownJson(row.template));
  if (!parsed.success) {
    console.error("Skipped unreadable problem family", row.id, parsed.error.flatten());
    return null;
  }
  const template = parsed.data;
  return {
    id: row.id,
    slug: row.slug,
    title: (typeof row.title === "string" ? row.title.trim() : "") || row.slug,
    topic: row.topic,
    parentId: typeof row.parentId === "string" ? row.parentId : null,
    instructionId: row.instructionId,
    difficulties: template.difficulties,
    years: template.years,
    variantCount: template.variants.length,
    json: prettyTemplateJson(bindTemplate(template, row.slug, row.topic)),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseFamilyJson(raw: string):
  | { ok: true; template: ProblemTemplate }
  | { ok: false; error: "invalid" } {
  let parsedJson: unknown;
  try {
    parsedJson = parseTeacherJson(raw);
  } catch {
    return { ok: false, error: "invalid" };
  }
  const parsed = parseProblemTemplate(parsedJson);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }
  return { ok: true, template: parsed.data };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

function familyDelegate() {
  const delegate = prisma.problemFamily;
  if (!delegate) {
    throw new Error("prisma_client_stale");
  }
  return delegate;
}

export async function loadTeacherFamilies(authorId: string) {
  try {
    const rows = await familyDelegate().findMany({
      where: { authorId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return rows.flatMap((row) => {
      const family = rowToFamily(row);
      return family ? [family] : [];
    });
  } catch (error) {
    if (error instanceof Error && error.message === "prisma_client_stale") {
      console.error(
        "Prisma client is missing problemFamily. Restart next dev after prisma generate.",
      );
      return [];
    }
    throw error;
  }
}

export async function saveTeacherFamily(
  authorId: string,
  input: { json: string; id?: string; title?: string; topic?: string },
): Promise<
  | { ok: true; family: SavedProblemFamily }
  | { ok: false; error: FamilyPersistError }
> {
  const parsed = parseFamilyJson(input.json);
  if (!parsed.ok) return parsed;

  try {
    if (input.id) {
      const existing = await familyDelegate().findFirst({
        where: { id: input.id, authorId },
      });
      if (!existing) return { ok: false, error: "not_found" };

      const topic = input.topic ?? existing.topic;
      const title = input.title?.trim() || existing.title || existing.slug;
      const template = bindTemplate(parsed.template, existing.slug, topic);
      const updated = await familyDelegate().update({
        where: { id: existing.id },
        data: {
          title,
          topic,
          instructionId: template.instructionId,
          template: template as unknown as Prisma.InputJsonValue,
        },
      });
      const family = rowToFamily(updated);
      if (!family) return { ok: false, error: "invalid" };
      return { ok: true, family };
    }

    const topic = input.topic ?? parsed.template.topic;
    const slug = parsed.template.id;
    const title = input.title?.trim() || slug;
    const template = bindTemplate(parsed.template, slug, topic);
    const upserted = await familyDelegate().upsert({
      where: {
        authorId_slug: { authorId, slug },
      },
      create: {
        authorId,
        slug,
        title,
        topic,
        instructionId: template.instructionId,
        template: template as unknown as Prisma.InputJsonValue,
      },
      update: {
        title,
        topic,
        instructionId: template.instructionId,
        template: template as unknown as Prisma.InputJsonValue,
      },
    });
    const family = rowToFamily(upserted);
    if (!family) return { ok: false, error: "invalid" };
    return { ok: true, family };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "slug_taken" };
    }
    console.error("Failed to save problem family", error);
    return { ok: false, error: "failed" };
  }
}

async function uniqueSlug(authorId: string, title: string) {
  let slug = slugFromTitle(title);
  for (let n = 2; n <= 40; n += 1) {
    const taken = await familyDelegate().findFirst({
      where: { authorId, slug },
      select: { id: true },
    });
    if (!taken) return slug;
    slug = `${slugFromTitle(title).slice(0, 40)}-${n}`;
  }
  return `${slugFromTitle(title).slice(0, 32)}-${Date.now().toString(36)}`;
}

export async function createTeacherKind(
  authorId: string,
  input: { title: string; topic: ProblemTopic; parentId?: string },
): Promise<
  | { ok: true; family: SavedProblemFamily }
  | { ok: false; error: FamilyPersistError }
> {
  const title = input.title.trim();

  try {
    let parentId: string | null = null;
    if (input.parentId) {
      const parent = await familyDelegate().findFirst({
        where: { id: input.parentId, authorId },
        select: { id: true, parentId: true, topic: true },
      });
      if (!parent) return { ok: false, error: "not_found" };
      parentId = parent.parentId ?? parent.id;
    }

    const slug = await uniqueSlug(authorId, title);
    const topic = input.topic;
    const template = stubFamilyTemplate(slug, topic, title);
    const created = await familyDelegate().create({
      data: {
        authorId,
        slug,
        title,
        topic,
        instructionId: template.instructionId,
        template: template as unknown as Prisma.InputJsonValue,
        ...(parentId ? { parentId } : {}),
      },
    });
    const family = rowToFamily(created);
    if (!family) return { ok: false, error: "invalid" };
    return { ok: true, family };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "slug_taken" };
    }
    console.error("Failed to create family kind", error);
    return { ok: false, error: "failed" };
  }
}

export async function deleteTeacherFamily(authorId: string, familyId: string) {
  const existing = await familyDelegate().findFirst({
    where: { id: familyId, authorId },
    select: { id: true, parentId: true },
  });
  if (!existing) return false;
  await prisma.$transaction([
    familyDelegate().deleteMany({
      where: { authorId, parentId: existing.id },
    }),
    familyDelegate().delete({ where: { id: existing.id } }),
  ]);
  return true;
}

export async function loadTeacherFamily(authorId: string, familyId: string) {
  const row = await familyDelegate().findFirst({
    where: { id: familyId, authorId },
  });
  if (!row) return null;
  return rowToFamily(row);
}
