import type { Prisma, Problem as ProblemRow } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PROBLEM_INSTRUCTIONS,
  type BankProblem,
  type ProblemInstructionId,
  type ProblemTemplateId,
  type ProblemYear,
} from "./types";
import {
  isUnsavedId,
  type PersistProblemInput,
} from "./persist-schema";

const DRAFT_SET_SLUG = "lesson-draft";

const YEAR_TO_ENUM = {
  "7": "YEAR_7",
  "8": "YEAR_8",
  "9": "YEAR_9",
  "10": "YEAR_10",
  "11": "YEAR_11",
  "12": "YEAR_12",
} as const;

const ENUM_TO_YEAR: Record<(typeof YEAR_TO_ENUM)[ProblemYear], ProblemYear> = {
  YEAR_7: "7",
  YEAR_8: "8",
  YEAR_9: "9",
  YEAR_10: "10",
  YEAR_11: "11",
  YEAR_12: "12",
};

function variablesFromJson(
  value: Prisma.JsonValue | null,
): Record<string, number> | undefined {
  let parsed: Prisma.JsonValue | null = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as Prisma.JsonValue;
    } catch {
      return undefined;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  const variables: Record<string, number> = {};
  for (const [name, raw] of Object.entries(parsed)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      variables[name] = raw;
    }
  }
  return Object.keys(variables).length > 0 ? variables : undefined;
}

function asTemplateId(value: string): ProblemTemplateId {
  return value as ProblemTemplateId;
}

function asInstructionId(value: string): ProblemInstructionId {
  if ((PROBLEM_INSTRUCTIONS as readonly string[]).includes(value)) {
    return value as ProblemInstructionId;
  }
  return "evaluate";
}

export function rowToBankProblem(row: ProblemRow): BankProblem {
  return {
    id: row.id,
    templateId: asTemplateId(row.templateId),
    topic: row.topic,
    difficulty: row.difficulty,
    year: ENUM_TO_YEAR[row.yearGroup] ?? "9",
    source: row.source,
    instructionId: asInstructionId(row.instructionId),
    promptTex: row.promptTex,
    solutionTex: row.solutionTex,
    seed: row.seed ?? undefined,
    graphExpr: row.graphExpr ?? undefined,
    kind: row.kind ?? undefined,
    formula: row.formula ?? undefined,
    variables: variablesFromJson(row.variables),
    promptTemplate: row.promptTemplate ?? undefined,
  };
}

function toCreateData(input: PersistProblemInput, authorId: string) {
  return {
    authorId,
    templateId: input.templateId,
    topic: String(input.topic),
    difficulty: input.difficulty,
    yearGroup: YEAR_TO_ENUM[input.year],
    source: input.source,
    instructionId: input.instructionId,
    promptTex: input.promptTex,
    solutionTex: input.solutionTex,
    seed: input.seed ?? null,
    graphExpr: input.graphExpr || null,
    kind: input.kind || null,
    formula: input.formula || null,
    variables: (input.variables ?? undefined) as Prisma.InputJsonValue | undefined,
    promptTemplate: input.promptTemplate || null,
  };
}

export async function saveTeacherProblems(
  authorId: string,
  inputs: PersistProblemInput[],
) {
  const idMap: Record<string, string> = {};
  const saved: BankProblem[] = [];

  await prisma.$transaction(async (tx) => {
    for (const input of inputs) {
      if (!isUnsavedId(input.clientId)) {
        const existing = await tx.problem.findFirst({
          where: { id: input.clientId, authorId },
        });
        if (existing) {
          const updated = await tx.problem.update({
            where: { id: existing.id },
            data: toCreateData(input, authorId),
          });
          idMap[input.clientId] = updated.id;
          saved.push(rowToBankProblem(updated));
          continue;
        }
      }

      const created = await tx.problem.create({
        data: toCreateData(input, authorId),
      });
      idMap[input.clientId] = created.id;
      saved.push(rowToBankProblem(created));
    }
  });

  return { saved, idMap };
}

export async function loadTeacherProblems(authorId: string) {
  const rows = await prisma.problem.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.flatMap((row) => {
    try {
      return [rowToBankProblem(row)];
    } catch (error) {
      console.error("Skipped unreadable problem row", row.id, error);
      return [];
    }
  });
}

export async function deleteTeacherProblem(authorId: string, problemId: string) {
  const existing = await prisma.problem.findFirst({
    where: { id: problemId, authorId },
  });
  if (!existing) return false;

  await prisma.$transaction([
    prisma.problemSetItem.deleteMany({ where: { problemId } }),
    prisma.problem.delete({ where: { id: problemId } }),
  ]);
  return true;
}

export async function loadDraftLessonSet(authorId: string) {
  try {
    const set = await prisma.problemSet.findFirst({
      where: { authorId, slug: DRAFT_SET_SLUG },
      include: { items: { orderBy: { position: "asc" } } },
    });
    return set?.items.map((item) => item.problemId) ?? [];
  } catch (error) {
    console.error("Failed to load draft lesson set", error);
    return [];
  }
}

export async function syncDraftLessonSet(authorId: string, problemIds: string[]) {
  const unique = [...new Set(problemIds)].slice(0, 48);

  const owned = unique.length
    ? await prisma.problem.findMany({
        where: { id: { in: unique }, authorId },
        select: { id: true },
      })
    : [];
  const ownedIds = new Set(owned.map((row) => row.id));
  const ordered = unique.filter((id) => ownedIds.has(id));

  await prisma.$transaction(async (tx) => {
    const set = await tx.problemSet.upsert({
      where: {
        authorId_slug: { authorId, slug: DRAFT_SET_SLUG },
      },
      create: {
        title: DRAFT_SET_SLUG,
        slug: DRAFT_SET_SLUG,
        authorId,
      },
      update: {},
    });

    await tx.problemSetItem.deleteMany({ where: { setId: set.id } });

    if (ordered.length > 0) {
      await tx.problemSetItem.createMany({
        data: ordered.map((problemId, position) => ({
          setId: set.id,
          problemId,
          position,
        })),
      });
    }
  });

  return ordered;
}
