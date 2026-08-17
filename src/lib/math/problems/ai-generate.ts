import type { BankProblem } from "./types";
import {
  generateDiverseProblemsSchema,
  type DiverseGenerateError,
  type GenerateDiverseProblemsInput,
} from "./ai-schema";
import { verifyFormula } from "./cas";
import { hasGeminiKey, proposeProblemsWithGemini } from "./gemini";
import { derivePromptTemplate, templateHasAll } from "./variants";

export type DiverseGenerateResult =
  | {
      ok: true;
      problems: BankProblem[];
      requested: number;
      verified: number;
      rejected: number;
    }
  | { ok: false; error: DiverseGenerateError };

export async function generateDiverseProblems(
  raw: GenerateDiverseProblemsInput,
): Promise<DiverseGenerateResult> {
  const input = generateDiverseProblemsSchema.parse(raw);

  if (!hasGeminiKey()) {
    return { ok: false, error: "missing_key" };
  }

  const request =
    input.request && input.request.length > 0
      ? input.request
      : `${input.count} different types of ${input.topic} problems`;

  let drafts;
  try {
    drafts = await proposeProblemsWithGemini({
      request,
      topic: input.topic,
      difficulty: input.difficulty,
      year: input.year,
      count: input.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "missing_key") {
      return { ok: false, error: "missing_key" };
    }
    return { ok: false, error: "failed" };
  }

  const problems: BankProblem[] = [];
  const usedKinds = new Set<string>();
  let rejected = 0;

  for (const draft of drafts) {
    if (problems.length >= input.count) break;

    const kind = draft.kind.trim().toLowerCase().replace(/\s+/g, "-");
    if (usedKinds.has(kind)) {
      rejected += 1;
      continue;
    }

    const cas = verifyFormula(draft.formula, draft.variables);
    if (!cas.ok) {
      rejected += 1;
      continue;
    }

    usedKinds.add(kind);
    const seed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
    const variables = Object.fromEntries(
      draft.variables.map((entry) => [entry.name, entry.value]),
    );
    const promptTemplate =
      (draft.promptTemplate && templateHasAll(draft.promptTemplate, variables)
        ? draft.promptTemplate
        : derivePromptTemplate(draft.promptTex, variables)) ?? undefined;
    problems.push({
      id: `ai-${kind}-${seed}-${problems.length}`,
      templateId: "ai-verified",
      topic: input.topic,
      difficulty: input.difficulty,
      year: input.year,
      source: "ai",
      instructionId: draft.instructionId,
      promptTex: draft.promptTex,
      solutionTex: cas.solutionTex,
      seed,
      kind,
      formula: draft.formula,
      variables,
      promptTemplate,
    });
  }

  if (problems.length === 0) {
    return { ok: false, error: "none_verified" };
  }

  return {
    ok: true,
    problems,
    requested: input.count,
    verified: problems.length,
    rejected,
  };
}
