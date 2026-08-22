"use server";

import { revalidatePath } from "next/cache";
import { locales } from "@/i18n/config";
import { getSession } from "@/lib/auth/session";
import { ensureDbUser } from "@/lib/auth/ensure-user";
import {
  generateDiverseProblems,
  type DiverseGenerateResult,
} from "./ai-generate";
import { classifyProviderError, completeTeacherChatMessage } from "./ai-complete";
import { listAiModelStatus, type AiModelStatus } from "./ai-limits";
import {
  teacherAiChatSchema,
  generateDiverseProblemsSchema,
  type TeacherAiChatError,
  type GenerateDiverseProblemsInput,
} from "./ai-schema";
import { assertModelAvailable, recordModelUse } from "./ai-limits";
import { rememberProviderWallet } from "./ai-billing";
import { getAiModel } from "./ai-models";
import {
  proposeTemplateFromExample,
  proposeTemplateSchema,
  type ProposeTemplateResult,
} from "./templates/from-example";
import { generateFromTemplate } from "./algorithms";
import type { ImportIssue } from "./templates/audit";
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
  addToLabWorkspace,
  removeFromLabWorkspace,
  removeFromLabWorkspaceMany,
  copyLabProblemsToBank,
  saveTeacherProblems,
  syncDraftLessonSet,
  deleteTeacherProblems,
} from "./persist";
import {
  lessonSetIdsSchema,
  persistProblemsSchema,
} from "./persist-schema";
import type { BankProblem } from "./types";
import {
  deleteTaxonomyNode,
  ensureDefaultTaxonomy,
  taxonomyUpsertSchema,
  upsertTaxonomyNode,
  type TaxonomyNodeDto,
} from "./taxonomy";

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
  | { ok: false; error: FamilyActionError; issues?: ImportIssue[] };

export type GenerateFromFamilyResult =
  | { ok: true; problems: BankProblem[] }
  | { ok: false; error: FamilyActionError };

export type SaveProblemsResult =
  | { ok: true; saved: BankProblem[]; idMap: Record<string, string> }
  | { ok: false; error: PersistError };

export type CopyLabToBankResult =
  | {
      ok: true;
      saved: BankProblem[];
      idMap: Record<string, string>;
      skipped: Array<{
        labId: string;
        bankId: string;
        reason: "origin" | "content";
      }>;
    }
  | { ok: false; error: PersistError };

export type SyncSetResult =
  | { ok: true; lessonSetIds: string[]; saved: BankProblem[]; idMap: Record<string, string> }
  | { ok: false; error: PersistError };

export type SaveToLabResult =
  | { ok: true; labIds: string[]; saved: BankProblem[]; idMap: Record<string, string> }
  | { ok: false; error: PersistError };

export type TeacherAiChatResult =
  | { ok: true; reply: string }
  | { ok: false; error: TeacherAiChatError };

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

// export async function teacherAiChatAction(
//   raw: unknown,
// ): Promise<TeacherAiChatResult> {
//   const user = await requireTeacherRecord();
//   if (!user) return { ok: false, error: "unauthorized" };

//   const parsed = teacherAiChatSchema.safeParse(raw);
//   if (!parsed.success) return { ok: false, error: "failed" };

//   const input = {
//     ...parsed.data,
//     history: parsed.data.history
//       .filter((turn) => turn.content.trim().length > 0)
//       .slice(-20),
//   };

//   try {
//     await assertModelAvailable(input.model);
//   } catch (error) {
//     if (error instanceof Error && error.message === "missing_key") {
//       return { ok: false, error: "missing_key" };
//     }
//     if (error instanceof Error && error.message === "limit_exceeded") {
//       return { ok: false, error: "limit_exceeded" };
//     }
//     return { ok: false, error: "failed" };
//   }

//   const tryModel = async (modelId: typeof input.model) => {
//     const reply = await completeTeacherChatMessage({ ...input, modelId });
//     await recordModelUse(modelId);
//     const provider = getAiModel(modelId)?.provider;
//     if (provider) await rememberProviderWallet(provider, "ready");
//     return reply.trim();
//   };

//   try {
//     return { ok: true, reply: await tryModel(input.model) };
//   } catch (error) {
//     console.error(
//       "Teacher AI chat failed",
//       error instanceof Error ? error.message : error,
//     );
//     const classified = classifyProviderError(error);
//     const provider = getAiModel(input.model)?.provider;
//     if (provider && classified === "billing") {
//       await rememberProviderWallet(provider, "needs_billing");
//     }
//     if (
//       classified !== "failed" &&
//       classified !== "bad_output" &&
//       classified !== "timeout"
//     ) {
//       return { ok: false, error: classified };
//     }

//     const fallback = (await listAiModelStatus()).find(
//       (status) =>
//         status.id !== input.model &&
//         status.configured &&
//         (status.limit === 0 || status.remaining > 0),
//     );
//     if (!fallback) {
//       return { ok: false, error: classified };
//     }

//     try {
//       return { ok: true, reply: await tryModel(fallback.id) };
//     } catch (fallbackError) {
//       console.error(
//         "Teacher AI chat fallback failed",
//         fallbackError instanceof Error ? fallbackError.message : fallbackError,
//       );
//       const fallbackClassified = classifyProviderError(fallbackError);
//       const fallbackProvider = getAiModel(fallback.id)?.provider;
//       if (fallbackProvider && fallbackClassified === "billing") {
//         await rememberProviderWallet(fallbackProvider, "needs_billing");
//       }
//       return { ok: false, error: fallbackClassified };
//     }
//   }
// }

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

export async function saveToLabAction(raw: unknown): Promise<SaveToLabResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = persistProblemsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "failed" };

  try {
    const inputs = parsed.data.map((item) => ({ ...item, collection: "lab" as const }));
    const result = await saveTeacherProblems(user.id, inputs);
    const remapped = inputs.map(
      (item) => result.idMap[item.clientId] ?? item.clientId,
    );
    const labIds = await addToLabWorkspace(user.id, remapped);
    revalidateTeacherProblems();
    return { ok: true, labIds, saved: result.saved, idMap: result.idMap };
  } catch (error) {
    console.error("Failed to save problems to lab", error);
    return { ok: false, error: "failed" };
  }
}

export async function copyLabToBankAction(
  problemIds: string[],
): Promise<CopyLabToBankResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = lessonSetIdsSchema.safeParse(problemIds);
  if (!parsed.success) return { ok: false, error: "failed" };

  try {
    const result = await copyLabProblemsToBank(user.id, parsed.data);
    revalidateTeacherProblems();
    return { ok: true, ...result };
  } catch (error) {
    console.error("Failed to copy lab problems to bank", error);
    return { ok: false, error: "failed" };
  }
}

export async function removeFromLabAction(problemId: string) {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false as const, error: "unauthorized" as const };

  const parsed = lessonSetIdsSchema.safeParse([problemId]);
  if (!parsed.success) return { ok: false as const, error: "failed" as const };

  try {
    await removeFromLabWorkspace(user.id, parsed.data[0]!);
    revalidateTeacherProblems();
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to remove problem from lab", error);
    return { ok: false as const, error: "failed" as const };
  }
}

export async function removeFromLabBulkAction(problemIds: string[]) {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false as const, error: "unauthorized" as const };

  const parsed = lessonSetIdsSchema.safeParse(problemIds);
  if (!parsed.success) return { ok: false as const, error: "failed" as const };

  try {
    await removeFromLabWorkspaceMany(user.id, parsed.data);
    revalidateTeacherProblems();
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to remove problems from lab", error);
    return { ok: false as const, error: "failed" as const };
  }
}

export async function saveProblemsAction(
  raw: unknown,
): Promise<SaveProblemsResult> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = persistProblemsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "failed" };

  try {
    // Bank saves never join the lab collection.
    const inputs = parsed.data.map((item) => ({
      ...item,
      collection: "bank" as const,
    }));
    const result = await saveTeacherProblems(user.id, inputs);
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

export async function deleteProblemsAction(problemIds: string[]) {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false as const, error: "unauthorized" as const };

  const parsed = lessonSetIdsSchema.safeParse(problemIds);
  if (!parsed.success) return { ok: false as const, error: "failed" as const };

  try {
    await deleteTeacherProblems(user.id, parsed.data);
    revalidateTeacherProblems();
    return { ok: true as const };
  } catch (error) {
    console.error("Failed to delete teacher problems", error);
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
      const result = await saveTeacherProblems(
        user.id,
        toSave.data.map((item) => ({ ...item, collection: "bank" as const })),
      );
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

/* ─── Curriculum taxonomy ───────────────────────────────────────── */

export type TaxonomyActionError =
  | "unauthorized"
  | "invalid"
  | "failed"
  | "branch_no_parent"
  | "parent_required"
  | "bad_parent";

export async function loadTaxonomyAction() {
  const user = await requireTeacherRecord();
  if (!user) {
    return [] as Awaited<ReturnType<typeof ensureDefaultTaxonomy>>;
  }
  try {
    return await ensureDefaultTaxonomy();
  } catch (error) {
    console.error("Failed to load taxonomy", error);
    return [];
  }
}

export async function upsertTaxonomyNodeAction(
  raw: unknown,
): Promise<
  | { ok: true; node: TaxonomyNodeDto }
  | { ok: false; error: TaxonomyActionError }
> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = taxonomyUpsertSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const node = await upsertTaxonomyNode(parsed.data);
    for (const locale of locales) {
      revalidatePath(`/${locale}/teacher/admin`);
      revalidatePath(`/${locale}/teacher/lab`);
      revalidatePath(`/${locale}/teacher/problems`);
    }
    return { ok: true, node };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message === "branch_no_parent" ||
      message === "parent_required" ||
      message === "bad_parent"
    ) {
      return { ok: false, error: message };
    }
    console.error("Failed to upsert taxonomy node", error);
    return { ok: false, error: "failed" };
  }
}

export async function deleteTaxonomyNodeAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: TaxonomyActionError }> {
  const user = await requireTeacherRecord();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!id.trim()) return { ok: false, error: "invalid" };

  try {
    await deleteTaxonomyNode(id.trim());
    for (const locale of locales) {
      revalidatePath(`/${locale}/teacher/admin`);
      revalidatePath(`/${locale}/teacher/lab`);
      revalidatePath(`/${locale}/teacher/problems`);
    }
    return { ok: true };
  } catch (error) {
    console.error("Failed to delete taxonomy node", error);
    return { ok: false, error: "failed" };
  }
}
