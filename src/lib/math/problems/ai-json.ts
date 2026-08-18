import {
  plainProblemDraftSchema,
  verifiedProblemDraftSchema,
  type AiCheckMode,
  type PlainProblemDraft,
  type VerifiedProblemDraft,
} from "./ai-schema";
import { PROBLEM_INSTRUCTIONS, PROBLEM_YEARS } from "./types";

function extractJsonText(text: string) {
  const stripped = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  const marker = stripped.search(/"problems"\s*:/);
  if (marker >= 0) {
    const start = stripped.lastIndexOf("{", marker);
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return stripped.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
    }
  }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return stripped.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
}

/** Models often put LaTeX `\frac` / `\( ` in JSON; those are not legal escapes. */
export function repairJsonEscapes(text: string) {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = text[i + 1];
    if (next === undefined) {
      out += "\\\\";
      break;
    }
    if (next === '"' || next === "\\" || next === "/") {
      out += `\\${next}`;
      i += 1;
      continue;
    }
    if (next === "u" && /^[0-9a-fA-F]{4}/.test(text.slice(i + 2, i + 6))) {
      out += text.slice(i, i + 6);
      i += 5;
      continue;
    }
    const after = text[i + 2] ?? "";
    if ("bfnrt".includes(next) && !/[A-Za-z]/.test(after)) {
      out += `\\${next}`;
      i += 1;
      continue;
    }
    out += `\\\\${next}`;
    i += 1;
  }
  return out;
}

function salvageTruncatedJson(text: string) {
  const lastObj = text.lastIndexOf("}");
  if (lastObj < 0) return null;
  let snippet = text.slice(0, lastObj + 1);
  const opens = (snippet.match(/\[/g) ?? []).length;
  const closes = (snippet.match(/\]/g) ?? []).length;
  const braces = (snippet.match(/{/g) ?? []).length;
  const braceCloses = (snippet.match(/}/g) ?? []).length;
  snippet += "]".repeat(Math.max(0, opens - closes));
  snippet += "}".repeat(Math.max(0, braces - braceCloses));
  try {
    return JSON.parse(snippet) as unknown;
  } catch {
    return null;
  }
}

function decodeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const repaired = repairJsonEscapes(text);
    try {
      return JSON.parse(repaired) as unknown;
    } catch {
      const salvaged = salvageTruncatedJson(repaired);
      if (salvaged) return salvaged;
      throw new Error("bad_output");
    }
  }
}

export function parseJsonPayload(text: string) {
  const candidate = extractJsonText(text);
  if (!candidate) throw new Error("bad_output");
  const parsed = decodeJson(candidate);
  if (typeof parsed === "string") return parseJsonPayload(parsed);
  return parsed;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /[iI]/.test(trimmed)) return null;
  if (Number.isFinite(Number(trimmed))) return Number(trimmed);
  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && "text" in value) {
    return String((value as { text?: unknown }).text ?? "");
  }
  return "";
}

function normalizeVariables(raw: unknown) {
  if (typeof raw === "string") {
    return raw.split(/[,;]+/).flatMap((part) => {
      const [name, value] = part.split(/[:=]/).map((bit) => bit.trim());
      const parsed = asNumber(value);
      if (!name || parsed === null) return [];
      return [{ name: name.slice(0, 12), value: parsed }];
    });
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => {
      if (Array.isArray(entry) && entry.length >= 2) {
        const name = String(entry[0] ?? "").trim();
        const value = asNumber(entry[1]);
        if (!name || value === null) return [];
        return [{ name: name.slice(0, 12), value }];
      }
      if (!entry || typeof entry !== "object") return [];
      const rec = entry as Record<string, unknown>;
      const name = String(
        rec.name ?? rec.id ?? rec.variable ?? rec.var ?? rec.symbol ?? "",
      ).trim();
      const value = asNumber(rec.value ?? rec.val ?? rec.n);
      if (!name || value === null) return [];
      return [{ name: name.slice(0, 12), value }];
    });
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).flatMap(
      ([name, value]) => {
        const parsed = asNumber(value);
        if (!name.trim() || parsed === null) return [];
        return [{ name: name.trim().slice(0, 12), value: parsed }];
      },
    );
  }
  return [];
}

function normalizeYear(raw: unknown) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  return (PROBLEM_YEARS as readonly string[]).includes(digits) ? digits : undefined;
}

function normalizeInstruction(raw: unknown) {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  const aliases: Record<string, (typeof PROBLEM_INSTRUCTIONS)[number]> = {
    solve: "solve",
    evaluate: "evaluate",
    calculate: "evaluate",
    compute: "evaluate",
    find: "evaluate",
    findderivative: "findDerivative",
    derivative: "findDerivative",
    percentof: "percentOf",
    percent: "percentOf",
    missingside: "missingSide",
    pythagoras: "missingSide",
    expand: "expand",
  };
  return aliases[key] ?? "evaluate";
}

function normalizeDifficulty(raw: unknown) {
  const key = String(raw ?? "medium").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (key === "easy" || key === "medium" || key === "hard") return key;
  if (
    key.includes("hard") ||
    key.includes("contest") ||
    key.includes("olymp") ||
    key.includes("difficult")
  ) {
    return "hard";
  }
  if (key.includes("easy") || key.includes("simple")) return "easy";
  return "medium";
}

function coerceTopic(raw: string) {
  const slug = raw
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u10a0-\u10ff-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "algebra";
}

function variablesFromFormula(formula: string) {
  const reserved = new Set([
    "pi",
    "e",
    "tau",
    "sin",
    "cos",
    "tan",
    "log",
    "ln",
    "sqrt",
    "abs",
    "pow",
    "min",
    "max",
  ]);
  const names = [
    ...new Set(formula.match(/\b[a-zA-Z][a-zA-Z0-9]{0,11}\b/g) ?? []),
  ].filter((name) => !reserved.has(name.toLowerCase()));
  return names.slice(0, 8).map((name, index) => ({
    name,
    value: index + 2,
  }));
}
function formulaFrom(rec: Record<string, unknown>) {
  const direct = rec.formula ?? rec.expression ?? rec.expr ?? rec.mathjs ?? rec.math;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") {
    const nested = direct as Record<string, unknown>;
    return asText(nested.expr ?? nested.expression ?? nested.latex ?? nested.text);
  }
  return "";
}

function normalizeProblem(raw: unknown, check: AiCheckMode) {
  if (!raw || typeof raw !== "object") return raw;
  const rec = raw as Record<string, unknown>;
  const kind = asText(rec.kind ?? rec.type ?? rec.id ?? "problem")
    .trim()
    .slice(0, 48) || "problem";
  const promptMax = check === "plain" ? 4000 : 800;
  const formula = formulaFrom(rec).slice(0, 320);
  const variables = normalizeVariables(rec.variables ?? rec.vars ?? rec.params);
  const promptTex = asText(
    rec.promptTex ?? rec.prompt ?? rec.statement ?? rec.question ?? rec.stem,
  ).slice(0, promptMax);
  const solutionTex =
    asText(rec.solutionTex ?? rec.solution ?? rec.answer ?? rec.working).slice(
      0,
      check === "plain" ? 12000 : 4000,
    ) || (check === "plain" ? promptTex : "");
  return {
    kind: kind.replace(/\s+/g, "-").slice(0, 48) || "problem",
    topic: coerceTopic(asText(rec.topic ?? rec.subject ?? "algebra")),
    difficulty: normalizeDifficulty(rec.difficulty),
    year: normalizeYear(rec.year ?? rec.yearGroup) ?? "9",
    instructionId: normalizeInstruction(rec.instructionId ?? rec.instruction),
    promptTex,
    promptTemplate: rec.promptTemplate
      ? asText(rec.promptTemplate).slice(0, promptMax)
      : undefined,
    formula,
    variables: variables.length > 0 ? variables : variablesFromFormula(formula),
    solutionTex,
  };
}

function asProblemList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const rec = raw as Record<string, unknown>;
  const list =
    rec.problems ?? rec.items ?? rec.data ?? rec.exercises ?? rec.questions;
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") {
    return Object.values(list as Record<string, unknown>);
  }
  if (rec.promptTex || rec.prompt || rec.formula || rec.question) return [rec];
  return [];
}

function normalizePayload(raw: unknown, check: AiCheckMode) {
  return {
    problems: asProblemList(raw).map((item) => normalizeProblem(item, check)),
  };
}

export function parseProblemPayload(text: string, check: AiCheckMode) {
  if (!text.trim()) throw new Error("bad_output");
  const schema =
    check === "verified" ? verifiedProblemDraftSchema : plainProblemDraftSchema;
  const problems: (VerifiedProblemDraft | PlainProblemDraft)[] = [];
  let firstIssues: string[] | undefined;
  let rawItems: unknown[] = [];
  try {
    rawItems = normalizePayload(parseJsonPayload(text), check).problems;
  } catch {
    console.error(
      "AI JSON parse failed",
      text.slice(0, 280).replace(/\s+/g, " "),
    );
    throw new Error("bad_output");
  }
  for (const item of rawItems) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      problems.push(parsed.data);
      continue;
    }
    firstIssues ??= parsed.error.issues.slice(0, 6).map(
      (issue) => `${issue.path.join(".") || "item"}: ${issue.message}`,
    );
  }
  if (problems.length === 0) {
    console.error(
      "AI draft schema rejected",
      firstIssues ?? ["no problems in payload"],
      `raw=${rawItems.length}`,
      text.slice(0, 280).replace(/\s+/g, " "),
    );
    throw new Error("bad_output");
  }
  return problems;
}

export type ProposedProblems = VerifiedProblemDraft[] | PlainProblemDraft[];
