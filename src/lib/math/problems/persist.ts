import type { Prisma, Problem as ProblemRow } from "@prisma/client";
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
const LAB_SET_SLUG = "lab-workspace";
const LAB_SET_MAX = 200;

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
    year: row.yearGroup ? ENUM_TO_YEAR[row.yearGroup] : undefined,
    source: row.source,
    collection: row.collection,
    originId: row.originId ?? undefined,
    instructionId: asInstructionId(row.instructionId),
    promptTex: row.promptTex,
    solutionTex: row.solutionTex,
    seed: row.seed ?? undefined,
    graphExpr: row.graphExpr ?? undefined,
    kind: row.kind ?? undefined,
    formula: row.formula ?? undefined,
    variables: variablesFromJson(row.variables),
    promptTemplate: row.promptTemplate ?? undefined,
    branchId: row.branchId ?? undefined,
    topicNodeId: row.topicNodeId ?? undefined,
    subtopicId: row.subtopicId ?? undefined,
    conceptId: row.conceptId ?? undefined,
  };
}

function toCreateData(input: PersistProblemInput, authorId: string) {
  return {
    authorId,
    templateId: input.templateId,
    topic: String(input.topic),
    difficulty: input.difficulty,
    yearGroup: input.year ? YEAR_TO_ENUM[input.year] : null,
    source: input.source,
    collection: input.collection ?? "bank",
    ...(input.originId !== undefined
      ? { originId: input.originId || null }
      : {}),
    instructionId: input.instructionId,
    promptTex: input.promptTex,
    solutionTex: input.solutionTex,
    seed: input.seed ?? null,
    graphExpr: input.graphExpr || null,
    kind: input.kind || null,
    formula: input.formula || null,
    variables: (input.variables ?? undefined) as Prisma.InputJsonValue | undefined,
    promptTemplate: input.promptTemplate || null,
    branchId: input.branchId || null,
    topicNodeId: input.topicNodeId || null,
    subtopicId: input.subtopicId || null,
    conceptId: input.conceptId || null,
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
      const collection = input.collection ?? "bank";
      // Lab and bank are separate: never update a row across collections.
      // Saving to bank from a lab id always creates a new bank card.
      if (!isUnsavedId(input.clientId)) {
        const existing = await tx.problem.findFirst({
          where: { id: input.clientId, authorId, collection },
        });
        if (existing) {
          const updated = await tx.problem.update({
            where: { id: existing.id },
            data: toCreateData({ ...input, collection }, authorId),
          });
          idMap[input.clientId] = updated.id;
          saved.push(rowToBankProblem(updated));
          continue;
        }
      }

      const created = await tx.problem.create({
        data: toCreateData({ ...input, collection }, authorId),
      });
      idMap[input.clientId] = created.id;
      saved.push(rowToBankProblem(created));
    }
  });

  return { saved, idMap };
}

export async function loadTeacherProblems(authorId: string) {
  const rows = await prisma.problem.findMany({
    where: { authorId, collection: "bank" },
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

export async function deleteTeacherProblems(
  authorId: string,
  problemIds: string[],
) {
  const unique = [...new Set(problemIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return 0;

  const owned = await prisma.problem.findMany({
    where: { id: { in: unique }, authorId },
    select: { id: true },
  });
  const ids = owned.map((row) => row.id);
  if (ids.length === 0) return 0;

  await prisma.$transaction([
    prisma.problemSetItem.deleteMany({ where: { problemId: { in: ids } } }),
    prisma.problem.deleteMany({ where: { id: { in: ids }, authorId } }),
  ]);
  return ids.length;
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
        where: { id: { in: unique }, authorId, collection: "bank" },
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

export async function loadLabWorkspace(authorId: string) {
  try {
    // Prefer ordered lab-workspace set when present; fall back to collection=lab.
    const set = await prisma.problemSet.findFirst({
      where: { authorId, slug: LAB_SET_SLUG },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: { problem: true },
        },
      },
    });

    if (set && set.items.length > 0) {
      const problems: BankProblem[] = [];
      const labIds: string[] = [];
        for (const item of set.items) {
        try {
          let row = item.problem;
          if (row.collection !== "lab") {
            row = await prisma.problem.update({
              where: { id: row.id },
              data: { collection: "lab" },
            });
          }
          problems.push(rowToBankProblem(row));
          labIds.push(item.problemId);
        } catch (error) {
          console.error("Skipped unreadable lab problem", item.problemId, error);
        }
      }
      return { problems, labIds };
    }

    const rows = await prisma.problem.findMany({
      where: { authorId, collection: "lab" },
      orderBy: { createdAt: "desc" },
      take: LAB_SET_MAX,
    });
    const problems = rows.flatMap((row) => {
      try {
        return [rowToBankProblem(row)];
      } catch (error) {
        console.error("Skipped unreadable lab problem", row.id, error);
        return [];
      }
    });
    return { problems, labIds: problems.map((problem) => problem.id) };
  } catch (error) {
    console.error("Failed to load lab workspace", error);
    return { problems: [] as BankProblem[], labIds: [] as string[] };
  }
}

export async function addToLabWorkspace(authorId: string, problemIds: string[]) {
  const incoming = [...new Set(problemIds)].filter((id) => !id.startsWith("bank-"));
  if (incoming.length === 0) return [] as string[];

  const owned = await prisma.problem.findMany({
    where: { id: { in: incoming }, authorId, collection: "lab" },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((row) => row.id));
  const toAdd = incoming.filter((id) => ownedIds.has(id));
  if (toAdd.length === 0) return [] as string[];

  return prisma.$transaction(async (tx) => {
    const set = await tx.problemSet.upsert({
      where: {
        authorId_slug: { authorId, slug: LAB_SET_SLUG },
      },
      create: {
        title: LAB_SET_SLUG,
        slug: LAB_SET_SLUG,
        authorId,
      },
      update: {},
    });

    const existing = await tx.problemSetItem.findMany({
      where: { setId: set.id },
      orderBy: { position: "asc" },
      select: { problemId: true },
    });
    const existingIds = existing.map((item) => item.problemId);
    const existingSet = new Set(existingIds);
    const appended = toAdd.filter((id) => !existingSet.has(id));
    const ordered = [...existingIds, ...appended].slice(0, LAB_SET_MAX);

    if (appended.length > 0) {
      const start = existingIds.length;
      await tx.problemSetItem.createMany({
        data: appended
          .filter((id) => ordered.includes(id))
          .map((problemId, index) => ({
            setId: set.id,
            problemId,
            position: start + index,
          })),
      });
    }

    return ordered;
  });
}

export async function removeFromLabWorkspace(authorId: string, problemId: string) {
  const existing = await prisma.problem.findFirst({
    where: { id: problemId, authorId },
  });
  if (!existing) return false;

  const set = await prisma.problemSet.findFirst({
    where: { authorId, slug: LAB_SET_SLUG },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (set) {
      await tx.problemSetItem.deleteMany({
        where: { setId: set.id, problemId },
      });
    }
    // Lab cards are lab-only — removing from lab deletes the row.
    // Bank copies (if any) are separate rows and stay untouched.
    if (existing.collection === "lab") {
      await tx.problemSetItem.deleteMany({ where: { problemId } });
      await tx.problem.delete({ where: { id: problemId } });
    }
  });
  return true;
}

export async function removeFromLabWorkspaceMany(
  authorId: string,
  problemIds: string[],
) {
  const unique = [...new Set(problemIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return 0;

  const owned = await prisma.problem.findMany({
    where: { id: { in: unique }, authorId },
    select: { id: true, collection: true },
  });
  if (owned.length === 0) return 0;

  const set = await prisma.problemSet.findFirst({
    where: { authorId, slug: LAB_SET_SLUG },
    select: { id: true },
  });
  const ids = owned.map((row) => row.id);
  const labRowIds = owned
    .filter((row) => row.collection === "lab")
    .map((row) => row.id);

  await prisma.$transaction(async (tx) => {
    if (set) {
      await tx.problemSetItem.deleteMany({
        where: { setId: set.id, problemId: { in: ids } },
      });
    }
    if (labRowIds.length > 0) {
      await tx.problemSetItem.deleteMany({
        where: { problemId: { in: labRowIds } },
      });
      await tx.problem.deleteMany({
        where: { id: { in: labRowIds }, authorId },
      });
    }
  });
  return ids.length;
}

/** Normalize prompt/solution text for duplicate detection. */
export function normalizeProblemFingerprint(
  promptTex: string,
  solutionTex = "",
) {
  return `${promptTex}\n---\n${solutionTex}`.replace(/\s+/g, " ").trim();
}

/** Clone lab cards into the bank as brand-new rows (lab originals stay in lab).
 *  Skips when a bank card already exists for the same lab origin or same content. */
export async function copyLabProblemsToBank(authorId: string, problemIds: string[]) {
  const unique = [...new Set(problemIds)];
  const rows = await prisma.problem.findMany({
    where: { id: { in: unique }, authorId, collection: "lab" },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  const bankRows = await prisma.problem.findMany({
    where: { authorId, collection: "bank" },
    select: {
      id: true,
      originId: true,
      promptTex: true,
      solutionTex: true,
    },
    take: 500,
  });

  const byOrigin = new Map<string, string>();
  const byFingerprint = new Map<string, string>();
  for (const bank of bankRows) {
    if (bank.originId) byOrigin.set(bank.originId, bank.id);
    byFingerprint.set(
      normalizeProblemFingerprint(bank.promptTex, bank.solutionTex),
      bank.id,
    );
  }

  const saved: BankProblem[] = [];
  const idMap: Record<string, string> = {};
  const skipped: Array<{
    labId: string;
    bankId: string;
    reason: "origin" | "content";
  }> = [];

  await prisma.$transaction(async (tx) => {
    for (const id of unique) {
      const row = byId.get(id);
      if (!row) continue;

      const originHit = byOrigin.get(id);
      if (originHit) {
        idMap[id] = originHit;
        skipped.push({ labId: id, bankId: originHit, reason: "origin" });
        continue;
      }

      const fingerprint = normalizeProblemFingerprint(
        row.promptTex,
        row.solutionTex,
      );
      const contentHit = byFingerprint.get(fingerprint);
      if (contentHit) {
        idMap[id] = contentHit;
        skipped.push({ labId: id, bankId: contentHit, reason: "content" });
        // Link the existing bank card to this lab origin for faster checks later.
        await tx.problem.update({
          where: { id: contentHit },
          data: { originId: id },
        });
        byOrigin.set(id, contentHit);
        continue;
      }

      const created = await tx.problem.create({
        data: {
          authorId,
          templateId: row.templateId,
          topic: row.topic,
          difficulty: row.difficulty,
          yearGroup: row.yearGroup,
          source: row.source,
          collection: "bank",
          originId: row.id,
          instructionId: row.instructionId,
          promptTex: row.promptTex,
          solutionTex: row.solutionTex,
          seed: row.seed,
          graphExpr: row.graphExpr,
          kind: row.kind,
          formula: row.formula,
          variables: row.variables ?? undefined,
          promptTemplate: row.promptTemplate,
        },
      });
      idMap[id] = created.id;
      saved.push(rowToBankProblem(created));
      byOrigin.set(id, created.id);
      byFingerprint.set(fingerprint, created.id);
    }
  });

  return { saved, idMap, skipped };
}
