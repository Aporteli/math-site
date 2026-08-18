import type { BankProblem } from "./types";
import {
  generateDiverseProblemsSchema,
  type DiverseGenerateError,
  type GenerateDiverseProblemsInput,
} from "./ai-schema";
import { numberToTex, normalizeMathJsFormula, verifyFormula } from "./cas";
import {
  difficultyFromRequest,
  draftFitsRequest,
  formulaMeetsDifficulty,
  resolveDifficulty,
  resolveTopic,
  resolveYear,
  sanitizeProblemText,
} from "./classify";
import { tidySignedTex, polishStudentTex } from "./tex";
import { proposeProblems, classifyProviderError, ProviderError } from "./ai-complete";
import { assertModelAvailable, recordModelUse } from "./ai-limits";
import { rememberProviderWallet } from "./ai-billing";
import { DEFAULT_AI_MODEL, getAiModel, type AiModelId } from "./ai-models";
import {
  derivePromptTemplate,
  fillPromptTemplate,
  templateHasAll,
} from "./variants";

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

  const modelId = input.model ?? DEFAULT_AI_MODEL;

  try {
    await assertModelAvailable(modelId);
  } catch (error) {
    if (error instanceof Error && error.message === "missing_key") {
      return { ok: false, error: "missing_key" };
    }
    if (error instanceof Error && error.message === "limit_exceeded") {
      return { ok: false, error: "limit_exceeded" };
    }
    return { ok: false, error: "failed" };
  }

  const request =
    input.request && input.request.length > 0
      ? input.request
      : input.topic
        ? `${input.count} different types of ${input.topic} problems`
        : `${input.count} different types of school mathematics problems`;

  const requiredDifficulty =
    difficultyFromRequest(request) ?? input.difficulty;

  try {
    if (input.check === "plain") {
      const problems = await buildPlainProblems(
        input,
        request,
        requiredDifficulty,
        modelId,
      );
      await recordModelUse(modelId);
      const provider = getAiModel(modelId)?.provider;
      if (provider) await rememberProviderWallet(provider, "ready");
      return packResult(input.count, problems);
    }

    const problems = await buildVerifiedProblems(
      input,
      request,
      requiredDifficulty,
      modelId,
    );
    await recordModelUse(modelId);
    const provider = getAiModel(modelId)?.provider;
    if (provider) await rememberProviderWallet(provider, "ready");
    return packResult(input.count, problems);
  } catch (error) {
    console.error(
      "AI generate failed",
      error instanceof ProviderError
        ? { status: error.status, code: error.code }
        : error instanceof Error
          ? error.message
          : error,
    );
    const classified = classifyProviderError(error);
    const provider = getAiModel(modelId)?.provider;
    if (provider && classified === "billing") {
      await rememberProviderWallet(provider, "needs_billing");
    }
    return { ok: false, error: classified };
  }
}

function packResult(requested: number, problems: BankProblem[]): DiverseGenerateResult {
  if (problems.length === 0) {
    return { ok: false, error: "none_verified" };
  }

  return {
    ok: true,
    problems,
    requested,
    verified: problems.length,
    rejected: 0,
  };
}

async function buildVerifiedProblems(
  input: GenerateDiverseProblemsInput,
  request: string,
  requiredDifficulty: ReturnType<typeof difficultyFromRequest>,
  modelId: AiModelId,
) {
  const drafts = await proposeProblems(modelId, {
    request,
    topic: input.topic,
    difficulty: requiredDifficulty,
    year: input.year,
    count: input.count,
    locale: input.locale,
    check: "verified",
  });

  const problems: BankProblem[] = [];
  const usedKinds = new Set<string>();

  for (const draft of drafts) {
    if (problems.length >= input.count) break;

    const kind = uniqueKind(draft.kind, usedKinds);
    const formula = normalizeMathJsFormula(draft.formula);
    const topic = resolveTopic(request, draft.topic, input.topic);
    const cas = verifyFormula(formula, draft.variables);
    if (!cas.ok) {
      console.warn("verified skip cas", kind, cas.reason, formula);
      continue;
    }
    if (
      requiredDifficulty &&
      !formulaMeetsDifficulty(formula, requiredDifficulty)
    ) {
      console.warn("verified skip difficulty", kind, requiredDifficulty, formula);
      continue;
    }

    const variables = Object.fromEntries(
      draft.variables.map((entry) => [entry.name, entry.value]),
    );
    const promptTex = materializeVerifiedPrompt(
      draft.promptTex,
      draft.promptTemplate,
      variables,
    );
    if (!promptTex) {
      console.warn("verified skip prompt", kind);
      continue;
    }
    if (
      !draftFitsRequest(request, {
        topic,
        kind,
        promptTex,
        formula,
      })
    ) {
      console.warn("verified skip request", kind, request);
      continue;
    }

    const seed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
    const promptTemplate =
      (draft.promptTemplate && templateHasAll(draft.promptTemplate, variables)
        ? draft.promptTemplate
        : derivePromptTemplate(promptTex, variables)) ?? undefined;

    usedKinds.add(kind);
    problems.push({
      id: `ai-${kind}-${seed}-${problems.length}`,
      templateId: "ai-verified",
      topic,
      difficulty: resolveDifficulty(
        draft.difficulty,
        requiredDifficulty ?? input.difficulty,
        request,
      ),
      year: resolveYear(draft.year, input.year),
      source: "ai",
      instructionId: draft.instructionId,
      promptTex,
      solutionTex: cas.solutionTex,
      seed,
      kind,
      formula,
      variables,
      promptTemplate,
    });
  }

  return problems;
}

function uniqueKind(raw: string, used: Set<string>) {
  const base = raw.trim().toLowerCase().replace(/\s+/g, "-") || "problem";
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function promptShowsNumbers(
  promptTex: string,
  variables: Record<string, number>,
) {
  const values = Object.values(variables).filter((value) => Number.isFinite(value));
  const notable = values.filter((value) => Math.abs(value) > 1);
  const pool = notable.length > 0 ? notable : values.filter((value) => value !== 0);
  return pool.some((value) => {
    const abs = Math.abs(value);
    return [String(value), String(abs), numberToTex(value)].some((bit) =>
      promptTex.includes(bit),
    );
  });
}

function looksLikeLetterIdentity(tex: string) {
  const compact = tex.replace(/\s+/g, "");
  return (
    /(?<![0-9])ax\^/.test(compact) ||
    /(?<![0-9])ax\^{2}/.test(compact) ||
    /b\^2-4ac/.test(compact) ||
    /b\^{2}-4ac/.test(compact) ||
    /-b\/(?:2a|\(2a\))/.test(compact) ||
    /\\frac\{-?b\}\{2a\}/.test(compact)
  );
}

function materializeVerifiedPrompt(
  rawPrompt: string,
  promptTemplate: string | undefined,
  variables: Record<string, number>,
) {
  const fromTemplate =
    promptTemplate && templateHasAll(promptTemplate, variables)
      ? fillPromptTemplate(promptTemplate, variables)
      : rawPrompt;
  const promptTex = sanitizeProblemText(fromTemplate, 800);
  if (!promptTex) return null;
  if (
    looksLikeLetterIdentity(promptTex) &&
    !promptShowsNumbers(promptTex, variables)
  ) {
    return null;
  }
  if (!promptShowsNumbers(promptTex, variables)) return null;
  return polishStudentTex(tidySignedTex(promptTex));
}

async function buildPlainProblems(
  input: GenerateDiverseProblemsInput,
  request: string,
  requiredDifficulty: ReturnType<typeof difficultyFromRequest>,
  modelId: AiModelId,
) {
  const drafts = await proposeProblems(modelId, {
    request,
    topic: input.topic,
    difficulty: requiredDifficulty,
    year: input.year,
    count: input.count,
    locale: input.locale,
    check: "plain",
  });

  const problems: BankProblem[] = [];
  const usedKinds = new Set<string>();

  for (const draft of drafts) {
    if (problems.length >= input.count) break;

    const kind = uniqueKind(draft.kind, usedKinds);
    const promptTex = polishStudentTex(
      sanitizeProblemText(draft.promptTex, 4000),
    );
    const solutionTex = polishStudentTex(
      sanitizeProblemText(draft.solutionTex, 12000),
    );
    if (!promptTex || !solutionTex) continue;

    const topic = resolveTopic(request, draft.topic, input.topic);

    usedKinds.add(kind);
    const seed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);

    problems.push({
      id: `ai-${kind}-${seed}-${problems.length}`,
      templateId: "ai-plain",
      topic,
      difficulty: resolveDifficulty(
        draft.difficulty,
        requiredDifficulty ?? input.difficulty,
        request,
      ),
      year: resolveYear(draft.year, input.year),
      source: "ai",
      instructionId: draft.instructionId ?? "evaluate",
      promptTex,
      solutionTex,
      seed,
      kind,
    });
  }

  return problems;
}
