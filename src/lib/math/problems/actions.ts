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

  return generateDiverseProblems(parsed.data);
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
