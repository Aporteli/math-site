import { z } from "zod";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  type BankProblem,
  type ProblemDifficulty,
  type ProblemTopic,
  type ProblemYear,
} from "./types";

const FENCE_PATTERNS = [
  /```math-site-problems\s*([\s\S]*?)```/i,
  /```json\s*([\s\S]*?)```/i,
  /```\s*([\s\S]*?)```/g,
] as const;

export const chatProblemCardSchema = z.object({
  promptTex: z.string().trim().min(1).max(8000),
  solutionTex: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) =>
      value === undefined || value === null ? undefined : String(value).trim(),
    ),
  topic: z.string().trim().min(1).max(48).optional(),
  difficulty: z.string().trim().optional(),
  year: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) =>
      value === undefined || value === null ? undefined : String(value).trim(),
    ),
});

export const chatProblemsBlockSchema = z.object({
  problems: z.array(chatProblemCardSchema).min(1).max(12),
});

export type ChatProblemCard = z.infer<typeof chatProblemCardSchema>;

/**
 * Models often emit LaTeX with a single `\`. JSON then treats `\t` `\n` `\b` `\f`
 * as escapes and corrupts `\text`, `\neq`, `\frac`, `\mathbb`, etc.
 * Double any `\` that starts a letter command, without touching `\"` `\\` `\uXXXX`.
 */
export function repairLatexBackslashes(raw: string): string {
  return raw.replace(/(?<!\\)\\(?!u[0-9a-fA-F]{4})(?=[A-Za-z])/g, "\\\\");
}

function parseJsonObject(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    if (start < 0) return null;
    const sliced = sliceBalancedObject(raw, start);
    if (!sliced) return null;
    try {
      return JSON.parse(sliced);
    } catch {
      return null;
    }
  }
}

function tryParseProblemsJson(raw: string): ChatProblemCard[] | null {
  const trimmed = raw.trim().replace(/^\uFEFF/, "");
  if (!trimmed) return null;

  // Prefer repaired first: unrepaired JSON often "succeeds" while turning
  // `\text`/`\neq`/`\frac` into tab/newline/form-feed escapes.
  const candidates = [repairLatexBackslashes(trimmed), trimmed];
  for (const candidate of candidates) {
    const parsed = parseJsonObject(candidate);
    if (!parsed) continue;
    const result = chatProblemsBlockSchema.safeParse(parsed);
    if (result.success) return result.data.problems;
  }
  return null;
}

/** Pull a balanced `{ ... }` object that starts at `from`. */
function sliceBalancedObject(text: string, from: number): string | null {
  if (text[from] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(from, i + 1);
    }
  }
  return null;
}

function findProblemsObjectIndex(reply: string): number {
  const loose = /\{\s*"problems"\s*:/i.exec(reply);
  return loose ? loose.index : -1;
}

function extractProblemsPayload(reply: string): {
  problems: ChatProblemCard[];
  rawBlock: string;
} | null {
  for (const pattern of FENCE_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const global = new RegExp(pattern.source, flags);
    let match: RegExpExecArray | null;
    let lastGood: { problems: ChatProblemCard[]; rawBlock: string } | null =
      null;
    while ((match = global.exec(reply))) {
      const problems = tryParseProblemsJson(match[1] ?? "");
      if (problems) {
        lastGood = { problems, rawBlock: match[0] };
      }
    }
    if (lastGood) return lastGood;
  }

  const bestIdx = findProblemsObjectIndex(reply);
  if (bestIdx >= 0) {
    const objectText = sliceBalancedObject(reply, bestIdx);
    if (objectText) {
      const problems = tryParseProblemsJson(objectText);
      if (problems) return { problems, rawBlock: objectText };
      // Still strip the blob from the visible reply even if parse failed.
      return { problems: [], rawBlock: objectText };
    }
  }

  return null;
}

/** Hide a trailing problems JSON blob from chat prose even when unparsable. */
function stripProblemsBlob(reply: string): string {
  for (const pattern of FENCE_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const global = new RegExp(pattern.source, flags);
    let cleaned = reply;
    let match: RegExpExecArray | null;
    const matches: string[] = [];
    while ((match = global.exec(reply))) {
      const body = match[1] ?? "";
      if (/"problems"\s*:/i.test(body)) matches.push(match[0]);
    }
    for (const block of matches) cleaned = cleaned.replace(block, "");
    if (cleaned !== reply) return cleaned;
  }
  const idx = findProblemsObjectIndex(reply);
  if (idx >= 0) {
    const objectText = sliceBalancedObject(reply, idx);
    if (objectText) return reply.replace(objectText, "");
  }
  return reply;
}

export function splitTeacherChatReply(reply: string): {
  prose: string;
  problems: ChatProblemCard[];
} {
  const extracted = extractProblemsPayload(reply);
  const prose = extracted
    ? reply.replace(extracted.rawBlock, "").trim()
    : stripProblemsBlob(reply).trim();

  const fromProse = extractProblemsFromProse(prose);
  const fromJson = extracted?.problems ?? [];
  const problems = mergeProseIntoCards(fromJson, fromProse);

  return { prose, problems };
}

/**
 * Pull stem/solution from readable chat blocks like:
 * "- ამოცანა 1" / "Problem 1" then "სტემი:" / "Stem:" and "ამოხსნა:" / "Solution:".
 * Models often write full text in prose but abbreviated JSON — prefer prose when richer.
 */
export function extractProblemsFromProse(prose: string): ChatProblemCard[] {
  if (!prose.trim()) return [];

  const header =
    /(?:^|\n)\s*[-*+]?\s*(?:ამოცანა|Problem|Задача|Exercise)\s*(\d+)\s*[:.]?\s*\n/giu;
  const starts: { index: number; full: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = header.exec(prose))) {
    starts.push({ index: match.index, full: match.index + match[0].length });
  }
  if (starts.length === 0) return [];

  const cards: ChatProblemCard[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const bodyStart = starts[i]!.full;
    const bodyEnd = i + 1 < starts.length ? starts[i + 1]!.index : prose.length;
    const body = prose.slice(bodyStart, bodyEnd).trim();
    const parsed = parseProseProblemBody(body);
    if (parsed) cards.push(parsed);
  }
  return cards;
}

function parseProseProblemBody(body: string): ChatProblemCard | null {
  const stemRe =
    /(?:სტემი|Stem|Prompt|Условие|დავალება)\s*:\s*/iu;
  const solRe =
    /(?:ამოხსნა|ამონახსნი|Solution|Решение)\s*:\s*/iu;

  const stemAt = stemRe.exec(body);
  const solAt = solRe.exec(body);

  let promptTex = "";
  let solutionTex = "";

  if (stemAt && solAt && solAt.index > stemAt.index) {
    promptTex = body
      .slice(stemAt.index + stemAt[0].length, solAt.index)
      .trim();
    solutionTex = body.slice(solAt.index + solAt[0].length).trim();
  } else if (solAt) {
    promptTex = body.slice(0, solAt.index).trim();
    solutionTex = body.slice(solAt.index + solAt[0].length).trim();
  } else if (stemAt) {
    promptTex = body.slice(stemAt.index + stemAt[0].length).trim();
  } else {
    // No labels — first paragraph = stem, rest = solution if multi-line.
    const parts = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      promptTex = parts[0]!;
      solutionTex = parts.slice(1).join("\n\n");
    } else {
      return null;
    }
  }

  promptTex = promptTex.replace(/^(?:სტემი|Stem|Prompt)\s*:\s*/iu, "").trim();
  solutionTex = solutionTex
    .replace(/^(?:ამოხსნა|ამონახსნი|Solution)\s*:\s*/iu, "")
    .trim();

  if (!promptTex) return null;
  return {
    promptTex,
    solutionTex: solutionTex || undefined,
    year: undefined,
  };
}

function mergeProseIntoCards(
  fromJson: ChatProblemCard[],
  fromProse: ChatProblemCard[],
): ChatProblemCard[] {
  if (fromProse.length === 0) return fromJson;
  if (fromJson.length === 0) return fromProse;

  const count = Math.max(fromJson.length, fromProse.length);
  const merged: ChatProblemCard[] = [];
  for (let i = 0; i < count; i += 1) {
    const json = fromJson[i];
    const prose = fromProse[i];
    if (!json && prose) {
      merged.push(prose);
      continue;
    }
    if (json && !prose) {
      merged.push(json);
      continue;
    }
    if (!json || !prose) continue;

    const promptTex =
      scoreTexRichness(prose.promptTex) > scoreTexRichness(json.promptTex)
        ? prose.promptTex
        : json.promptTex;
    const jsonSol = json.solutionTex ?? "";
    const proseSol = prose.solutionTex ?? "";
    const solutionTex =
      scoreTexRichness(proseSol) > scoreTexRichness(jsonSol)
        ? proseSol
        : jsonSol;

    merged.push({
      ...json,
      promptTex,
      solutionTex: solutionTex || json.solutionTex || prose.solutionTex,
    });
  }
  return merged;
}

/** Prefer the longer, more sentence-like field (prose usually wins over formula-only JSON). */
function scoreTexRichness(tex: string): number {
  const t = tex.trim();
  if (!t) return 0;
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  const spaces = (t.match(/\s/g) ?? []).length;
  return t.length + letters * 2 + spaces * 3;
}

function coerceTopic(topic: string | undefined): ProblemTopic {
  if (topic && (PROBLEM_TOPICS as readonly string[]).includes(topic)) {
    return topic as ProblemTopic;
  }
  return "algebra";
}

function coerceDifficulty(
  difficulty: string | undefined,
): ProblemDifficulty {
  if (
    difficulty &&
    (PROBLEM_DIFFICULTIES as readonly string[]).includes(difficulty)
  ) {
    return difficulty as ProblemDifficulty;
  }
  return "medium";
}

function coerceYear(year: string | undefined): ProblemYear | undefined {
  if (year && (PROBLEM_YEARS as readonly string[]).includes(year)) {
    return year as ProblemYear;
  }
  return undefined;
}

function hasHumanProse(tex: string): boolean {
  // Georgian or Cyrillic letters, or multi-word Latin.
  if (/[\u10A0-\u10FF\u0400-\u04FF]/u.test(tex)) return true;
  return /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(tex);
}

/**
 * Scan a bare LaTeX island starting at `from` (usually a `\` command).
 * Stops before human-language letters so prose stays outside `$...$`.
 */
function scanLatexIsland(source: string, from: number): number {
  let i = from;
  let depth = 0;
  while (i < source.length) {
    const ch = source[i]!;

    if (depth === 0 && /[\u10A0-\u10FF\u0400-\u04FF]/u.test(ch)) break;

    if (depth === 0 && /[A-Za-z]/.test(ch) && source[i - 1] !== "\\") {
      const word = /^[A-Za-z]+/.exec(source.slice(i));
      if (
        word &&
        word[0].length >= 2 &&
        i > from &&
        /[\s.,;:!?…]/.test(source[i - 1] ?? "")
      ) {
        break;
      }
    }

    if (ch === "\\" && /[a-zA-Z]/.test(source[i + 1] ?? "")) {
      i += 1;
      while (i < source.length && /[A-Za-z]/.test(source[i]!)) i += 1;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    if (depth === 0 && ch === "\n") break;
    if (
      depth === 0 &&
      /[.,;:!?…]/.test(ch) &&
      /^\s+[\p{L}\u10A0-\u10FF\u0400-\u04FF]/u.test(source.slice(i + 1))
    ) {
      break;
    }

    if (/[0-9A-Za-z+\-*=()[\]_^,/<>|!\s]/.test(ch)) {
      i += 1;
      continue;
    }
    break;
  }
  return Math.max(i, from + 1);
}

/** Wrap undelimited `\\frac...` runs in `$...$`; leave Georgian/Cyrillic outside. */
export function wrapLatexIslands(tex: string): string {
  let out = "";
  let i = 0;
  let mode: "text" | "inline" | "display" | "paren" | "bracket" = "text";

  while (i < tex.length) {
    if (mode !== "text") {
      const closer =
        mode === "inline"
          ? "$"
          : mode === "display"
            ? "$$"
            : mode === "paren"
              ? "\\)"
              : "\\]";
      if (tex.startsWith(closer, i)) {
        out += closer;
        i += closer.length;
        mode = "text";
        continue;
      }
      out += tex[i]!;
      i += 1;
      continue;
    }

    if (tex.startsWith("$$", i)) {
      mode = "display";
      out += "$$";
      i += 2;
      continue;
    }
    if (tex.startsWith("\\[", i)) {
      mode = "bracket";
      out += "\\[";
      i += 2;
      continue;
    }
    if (tex.startsWith("\\(", i)) {
      mode = "paren";
      out += "\\(";
      i += 2;
      continue;
    }
    if (tex[i] === "$") {
      mode = "inline";
      out += "$";
      i += 1;
      continue;
    }

    if (tex[i] === "\\" && /[a-zA-Z]/.test(tex[i + 1] ?? "")) {
      const end = scanLatexIsland(tex, i);
      let chunk = tex.slice(i, end);
      const trail = chunk.match(/\s+$/);
      if (trail) chunk = chunk.slice(0, -trail[0].length);
      out += `$${chunk}$${trail?.[0] ?? ""}`;
      i = end;
      continue;
    }

    out += tex[i]!;
    i += 1;
  }

  return out;
}

/** Prefer Unicode prose; keep math in $...$. Unwrap shallow \text{...}. */
export function polishChatTex(tex: string): string {
  let s = tex
    .replace(/\r\n/g, "\n")
    // After repair+parse, intentional JSON `\n`/`\t` become literal `\n`/`\t`.
    .replace(/(?<!\\)\\n(?![A-Za-z])/g, "\n")
    .replace(/(?<!\\)\\t(?![A-Za-z])/g, "\t")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .trim();

  if (!s) return s;

  if (hasHumanProse(s)) {
    s = wrapLatexIslands(s);
  } else if (!/\$|\\\(|\\\[/.test(s) && /(?:\\[a-zA-Z]+|[_^])/.test(s)) {
    s = `$$${s}$$`;
  }

  return s;
}

export function chatCardsToBankProblems(
  cards: ChatProblemCard[],
  stamp = Date.now(),
): BankProblem[] {
  return cards.map((card, index) => {
    const year = coerceYear(card.year);
    return {
      id: `ai-chat-${stamp}-${index + 1}`,
      templateId: "ai-plain",
      topic: coerceTopic(card.topic),
      difficulty: coerceDifficulty(card.difficulty),
      ...(year ? { year } : {}),
      source: "ai" as const,
      instructionId: "solve" as const,
      promptTex: polishChatTex(card.promptTex).slice(0, 4000),
      solutionTex: (polishChatTex(card.solutionTex ?? "") || "—").slice(0, 12000),
    };
  });
}
