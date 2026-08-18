import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_INSTRUCTIONS,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  type ProblemDifficulty,
  type ProblemInstructionId,
  type ProblemTopic,
  type ProblemYear,
} from "../types";
import { problemTemplateSchema, type ProblemTemplate } from "./schema";

const SLOT = /(?<!\{)\{([A-Za-z][A-Za-z0-9_]{0,23})\}(?!\})/g;

const TOPIC_HINTS: [RegExp, ProblemTopic][] = [
  [/geometry|triangle|pythag|circle/i, "geometry"],
  [/percent/i, "percent"],
  [/calculus|derivative|integral/i, "calculus"],
  [/vector/i, "vectors"],
  [/combinator/i, "combinatorics"],
  [/function/i, "functions"],
  [
    /algebra|polynomial|vieta|quadratic|cubic|linear|sequence|series|progression|binomial/i,
    "algebra",
  ],
  [/equation/i, "equations"],
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function expandSlots(text: string, names: Set<string>) {
  return text.replace(SLOT, (full, name: string) =>
    names.has(name) ? `{{${name}}}` : full,
  );
}

function mapTopic(value: unknown): ProblemTopic {
  if (typeof value === "string" && (PROBLEM_TOPICS as readonly string[]).includes(value)) {
    return value as ProblemTopic;
  }
  const text = typeof value === "string" ? value : "";
  for (const [pattern, topic] of TOPIC_HINTS) {
    if (pattern.test(text)) return topic;
  }
  return "algebra";
}

function mapDifficulty(value: unknown): ProblemDifficulty {
  if (typeof value === "string") {
    const key = value.trim().toLowerCase();
    if ((PROBLEM_DIFFICULTIES as readonly string[]).includes(key)) {
      return key as ProblemDifficulty;
    }
    if (/olympiad|olympic|олимпиад|ოლიმპ/.test(key)) return "olympiad";
    if (/highly advanced|very hard|contest/.test(key)) return "olympiad";
  }
  return "medium";
}

function yearsFor(difficulty: ProblemDifficulty): ProblemYear[] {
  if (difficulty === "easy") return ["7", "8"];
  if (difficulty === "medium") return ["8", "9", "10"];
  return ["11", "12"];
}

function mapInstruction(
  value: unknown,
  prompt: string,
  hasNumericAnswer: boolean,
): ProblemInstructionId {
  if (
    typeof value === "string" &&
    (PROBLEM_INSTRUCTIONS as readonly string[]).includes(value)
  ) {
    return value as ProblemInstructionId;
  }
  const text = `${value ?? ""} ${prompt}`.toLowerCase();
  if (/\bevaluat|\bfind the difference|\bx_3\s*-\s*x_1/.test(text) || hasNumericAnswer) {
    return "evaluate";
  }
  if (/\bexpand/.test(text)) return "expand";
  if (/\bfactor/.test(text)) return "factor";
  if (/\bsimplif/.test(text)) return "simplify";
  return "solve";
}

function mapParam(spec: unknown): Record<string, unknown> | null {
  const rec = asRecord(spec);
  if (!rec) return null;
  if ("int" in rec || "pick" in rec || "byDifficulty" in rec) return rec;

  const type = typeof rec.type === "string" ? rec.type.toLowerCase() : "";
  if (type === "integer" || type === "int") {
    const min = typeof rec.min === "number" ? Math.trunc(rec.min) : 1;
    const max = typeof rec.max === "number" ? Math.trunc(rec.max) : min;
    return {
      int: [Math.min(min, max), Math.max(min, max)],
      ...(min > 0 || max < 0 ? { nonzero: true } : {}),
    };
  }
  return null;
}

function mapParams(value: unknown): Record<string, unknown> {
  const rec = asRecord(value);
  if (!rec) return {};
  const params: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(rec)) {
    const mapped = mapParam(spec);
    if (mapped) params[name] = mapped;
  }
  return params;
}

function rewriteConstraint(expr: string): string | null {
  const t = expr.replace(/\s+/g, " ").trim();
  return t || null;
}

function mapConstraints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const rewritten = rewriteConstraint(item);
    if (rewritten) out.push(rewritten);
  }
  return out;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function formulaFromAnswer(
  answer: string,
  derived: Record<string, unknown>,
  params: Record<string, unknown>,
): string | undefined {
  const match = answer.match(/^\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}\}$/);
  if (!match) return undefined;
  const name = match[1]!;
  const expr = derived[name];
  if (typeof expr === "string" && expr.trim()) return expr.trim();
  if (name in params) return name;
  return undefined;
}

/** Map a teacher/author JSON dialect onto the engine schema. */
export function adaptExternalTemplate(raw: unknown): unknown {
  const rec = asRecord(raw);
  if (!rec) return raw;

  const alreadyEngine =
    Array.isArray(rec.variants) &&
    Array.isArray(rec.difficulties) &&
    typeof rec.topic === "string" &&
    (PROBLEM_TOPICS as readonly string[]).includes(rec.topic) &&
    typeof rec.instructionId === "string";
  if (alreadyEngine) return rec;

  const difficulty = mapDifficulty(rec.difficulty ?? rec.difficulties);
  const params = mapParams(rec.params ?? rec.variables);
  const derived = asRecord(rec.derived) ?? {};
  const names = new Set([...Object.keys(params), ...Object.keys(derived)]);
  const prompt = expandSlots(
    String(rec.prompt ?? rec.prompt_latex ?? rec.promptTex ?? ""),
    names,
  );
  const steps = stringList(rec.solutionSteps ?? rec.solution_steps).map((step) =>
    expandSlots(step, names),
  );
  const answer =
    typeof rec.answer === "string" && rec.answer.trim()
      ? expandSlots(rec.answer.trim(), names)
      : "";
  if (answer && !steps.some((step) => step.includes(answer))) {
    steps.push(answer);
  }

  const years = stringList(rec.years).filter((year) =>
    (PROBLEM_YEARS as readonly string[]).includes(year),
  ) as ProblemYear[];

  const explicitFormula =
    typeof rec.formula === "string" && rec.formula.trim()
      ? rec.formula.trim()
      : formulaFromAnswer(answer, derived, params);

  return {
    id: typeof rec.id === "string" ? rec.id : "imported-family",
    topic: mapTopic(rec.topic),
    difficulties: [difficulty],
    years: years.length > 0 ? years : yearsFor(difficulty),
    instructionId: mapInstruction(rec.instructionId, prompt, Boolean(answer)),
    variants: [
      {
        id: typeof rec.id === "string" ? rec.id.slice(0, 48) : "main",
        params,
        derived,
        constraints: mapConstraints(rec.constraints),
        prompt,
        ...(explicitFormula ? { formula: explicitFormula } : {}),
        ...(steps.length > 0
          ? { solutionSteps: steps }
          : { solution: answer || prompt }),
      },
    ],
  };
}

export function parseProblemTemplate(raw: unknown) {
  return problemTemplateSchema.safeParse(adaptExternalTemplate(raw));
}

export function parseProblemTemplateOrThrow(raw: unknown): ProblemTemplate {
  return problemTemplateSchema.parse(adaptExternalTemplate(raw));
}
