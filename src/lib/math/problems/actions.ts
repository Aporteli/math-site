"use server";

import { revalidatePath } from "next/cache";
import { locales } from "@/i18n/config";
import { getSession } from "@/lib/auth/session";
import { ensureDbUser } from "@/lib/auth/ensure-user";
import {
  generateDiverseProblems,
  type DiverseGenerateResult,
} from "./ai-generate";
import { listAiModelStatus, type AiModelStatus } from "./ai-limits";
import {
  generateDiverseProblemsSchema,
  type GenerateDiverseProblemsInput,
} from "./ai-schema";
import {
  proposeTemplateFromExample,
  proposeTemplateSchema,
  type ProposeTemplateResult,
} from "./templates/from-example";
import { generateFromTemplate } from "./algorithms";
import { classifyTemplateGenerateFilter } from "./templates/engine";
import { stampFamilySource } from "./variants";
import {
  deleteTeacherFamily,
  loadTeacherFamilies,
  loadTeacherFamily,
  saveTeacherFamily,
  createTeacherKind,
  type SavedProblemFamily,
} from "./family-persist";
import {
  createFamilyKindSchema,
  familyIdSchema,
  generateFromFamilySchema,
  saveFamilySchema,
} from "./family-schema";
import {
  deleteTeacherProblem,
  loadDraftLessonSet,
  loadTeacherProblems,
  saveTeacherProblems,
  syncDraftLessonSet,
} from "./persist";
import {
  lessonSetIdsSchema,
  persistProblemsSchema,
} from "./persist-schema";
import type { BankProblem } from "./types";

export type PersistError = "unauthorized" | "failed";

export type FamilyActionError =
  | PersistError
  | "invalid"
  | "slug_taken"
  | "not_found"
  | "empty"
  | "no_match";

export type SaveFamilyResult =
  | { ok: true; family: SavedProblemFamily }
  | { ok: false; error: FamilyActionError };

export type GenerateFromFamilyResult =
  | { ok: true; problems: BankProblem[] }
  | { ok: false; error: FamilyActionError };

export type SaveProblemsResult =
  | { ok: true; saved: BankProblem[]; idMap: Record<string, string> }
  | { ok: false; error: PersistError };

export type SyncSetResult =
  | { ok: true; lessonSetIds: string[]; saved: BankProblem[]; idMap: Record<string, string> }
  | { ok: false; error: PersistError };

function revalidateTeacherProblems() {
  for (const locale of locales) {
    revalidatePath(`/${locale}/teacher/lab`);
  }
}

async function requireTeacherRecord() {
  const session = await getSession();
  const role = session?.user?.role;
  if (!session?.user || (role !== "TEACHER" && role !== "ADMIN")) {
    return null;
  }
  if (!session.user.email) return null;
  return ensureDbUser(session.user);
}

export async function generateDiverseProblemsAction(
  raw: GenerateDiverseProblemsInput,
): Promise<DiverseGenerateResult> {
  const session = await getSession();
  const role = session?.user?.role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = generateDiverseProblemsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "failed" };
  }

  try {
    return await generateDiverseProblems(parsed.data);
  } catch (error) {
    console.error("AI generate action failed", error instanceof Error ? error.message : error);
    return { ok: false, error: "failed" };
  }
}

export async function proposeTemplateAction(
  raw: unknown,
): Promise<ProposeTemplateResult> {
  const session = await getSession();
  const role = session?.user?.role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = proposeTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "failed" };
  }

  try {
    return await proposeTemplateFromExample(parsed.data);
  } catch (error) {
    console.error(
      "Template import failed",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, error: "failed" };
  }
}

export async function loadAiModelStatusAction(): Promise<AiModelStatus[]> {
  const session = await getSession();
  const role = session?.user?.role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return [];
  }
  return listAiModelStatus();
}

export async function loadTeacherBankAction(): Promise<{
  problems: BankProblem[];
  lessonSetIds: string[];
}> {
  const user = await requireTeacherRecord();
  if (!user) return { problems: [], lessonSetIds: [] };

  const [problems, lessonSetIds] = await Promise.all([
    loadTeacherProblems(user.id),
    loadDraftLessonSet(user.id),
  ]);
  return { problems, lessonSetIds };
}

export async function saveProblemsAction(
  raw: unknown,
): Promise<SaveProblemsResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = persistProblemsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "failed" };

  try {
    const result = await saveTeacherProblems(user.id, parsed.data);
    revalidateTeacherProblems();
    return { ok: true, ...result };
  } catch (error) {
    console.error("Failed to save teacher problems", error);
    return { ok: false, error: "failed" };
  }
}

export async function deleteProblemAction(problemId: string) {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false as const, error: "unauthorized" as const };

  const parsed = lessonSetIdsSchema.safeParse([problemId]);
  if (!parsed.success) return { ok: false as const, error: "failed" as const };

  try {
    await deleteTeacherProblem(user.id, parsed.data[0]!);
    revalidateTeacherProblems();
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to delete teacher problem", error);
    return { ok: false as const, error: "failed" as const };
  }
}

export async function syncLessonSetAction(
  problems: unknown,
  orderedIds: unknown,
): Promise<SyncSetResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const ids = lessonSetIdsSchema.safeParse(orderedIds);
  if (!ids.success) return { ok: false, error: "failed" };

  const toSave = persistProblemsSchema.safeParse(
    Array.isArray(problems) && problems.length > 0 ? problems : [],
  );

  try {
    let saved: BankProblem[] = [];
    let idMap: Record<string, string> = {};

    if (toSave.success && toSave.data.length > 0) {
      const result = await saveTeacherProblems(user.id, toSave.data);
      saved = result.saved;
      idMap = result.idMap;
    }

    const remapped = ids.data.map((id) => idMap[id] ?? id);
    const persistedIds = remapped.filter((id) => !id.startsWith("bank-"));
    const lessonSetIds = await syncDraftLessonSet(user.id, persistedIds);
    const catalogIds = remapped.filter((id) => id.startsWith("bank-"));
    revalidateTeacherProblems();
    return { ok: true, lessonSetIds: [...lessonSetIds, ...catalogIds], saved, idMap };
  } catch (error) {
    console.error("Failed to sync lesson set", error);
    return { ok: false, error: "failed" };
  }
}

export async function loadTeacherFamiliesAction(): Promise<SavedProblemFamily[]> {
  const user = await requireTeacherRecord();
  if (!user) return [];
  try {
    return await loadTeacherFamilies(user.id);
  } catch (error) {
    console.error("Failed to load teacher families", error);
    return [];
  }
}

export async function saveFamilyAction(raw: unknown): Promise<SaveFamilyResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = saveFamilySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const result = await saveTeacherFamily(user.id, parsed.data);
    if (result.ok) revalidateTeacherProblems();
    return result;
  } catch (error) {
    console.error("Failed to save problem family", error);
    return { ok: false, error: "failed" };
  }
}

export async function createFamilyKindAction(
  raw: unknown,
): Promise<SaveFamilyResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = createFamilyKindSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const result = await createTeacherKind(user.id, parsed.data);
    if (result.ok) revalidateTeacherProblems();
    return result;
  } catch (error) {
    console.error("Failed to create family kind", error);
    return { ok: false, error: "failed" };
  }
}

export async function deleteFamilyAction(familyId: string) {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false as const, error: "unauthorized" as const };

  const parsed = familyIdSchema.safeParse(familyId);
  if (!parsed.success) return { ok: false as const, error: "failed" as const };

  try {
    const deleted = await deleteTeacherFamily(user.id, parsed.data);
    if (!deleted) return { ok: false as const, error: "not_found" as const };
    revalidateTeacherProblems();
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to delete problem family", error);
    return { ok: false as const, error: "failed" as const };
  }
}

export async function generateFromFamilyAction(
  raw: unknown,
): Promise<GenerateFromFamilyResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = generateFromFamilySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const family = await loadTeacherFamily(user.id, parsed.data.id);
    if (!family) return { ok: false, error: "not_found" };

    const problems = stampFamilySource(
      generateFromTemplate(JSON.parse(family.json) as unknown, {
        count: parsed.data.count,
        difficulty: parsed.data.difficulty,
        year: parsed.data.year,
        locale: parsed.data.locale,
      }),
      family,
    );
    if (problems.length === 0) {
      const status = classifyTemplateGenerateFilter(
        JSON.parse(family.json) as unknown,
        {
          difficulty: parsed.data.difficulty,
          year: parsed.data.year,
        },
      );
      return { ok: false, error: status === "no_match" ? "no_match" : "empty" };
    }
    return { ok: true, problems };
  } catch (error) {
    console.error("Failed to generate from family", error);
    return { ok: false, error: "failed" };
  }
}
