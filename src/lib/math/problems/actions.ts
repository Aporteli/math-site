"use server";

import { getSession } from "@/lib/auth/session";
import {
  generateDiverseProblems,
  type DiverseGenerateResult,
} from "./ai-generate";
import {
  generateDiverseProblemsSchema,
  type GenerateDiverseProblemsInput,
} from "./ai-schema";

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
