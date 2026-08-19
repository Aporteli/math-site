import { evaluateTemplateExpr, verifyFormula } from "../cas";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  type BankProblem,
  type ProblemTopic,
} from "../types";
import { parseProblemTemplate } from "./adapt";
import type { ProblemTemplate, TemplateVariant } from "./schema";

const PLACEHOLDER = (name: string) => `{{${name}}}`;
const PARAM_NAMES = [
  "a",
  "b",
  "c",
  "d",
  "f",
  "g",
  "h",
  "p",
  "q",
  "r",
  "s",
  "u",
  "w",
] as const;
const DERIVED_NAMES = ["ans", "k", "m", "n", "t", "u2", "v2", "w2"] as const;
const NUMBER = /(?<![\d.])(-?\d+(?:\.\d+)?)(?![\d.])/g;
const HAS_SLOT = /\{\{\s*[A-Za-z]/;
const NAME_OK = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asTopic(value: string): ProblemTopic {
  if ((PROBLEM_TOPICS as readonly string[]).includes(value)) {
    return value as ProblemTopic;
  }
  return "algebra";
}

function valueSnippets(value: number): string[] {
  if (Number.isInteger(value)) {
    if (value < 0) return [`${value}`, `- ${Math.abs(value)}`];
    return [String(value)];
  }
  return [String(value)];
}

function isExponent(tex: string, index: number) {
  const left = tex.slice(0, index).replace(/\s+$/, "");
  return /\^\{?$/.test(left);
}

function isRootIndex(tex: string, index: number) {
  const left = tex.slice(0, index).replace(/\s+$/, "");
  return /\\sqrt\[$/.test(left);
}

/** Integers/decimals in the stem that are safe to resample (not exponents). */
export function extractVaryableNumbers(tex: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  const re = new RegExp(NUMBER.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(tex))) {
    if (isExponent(tex, match.index) || isRootIndex(tex, match.index)) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= 6) break;
  }
  return out;
}

function replaceValue(tex: string, value: number, token: string): string {
  for (const snippet of valueSnippets(value)) {
    const re = new RegExp(`(?<![0-9.])${escapeRegExp(snippet)}(?![0-9.])`, "g");
    const hits = [...tex.matchAll(re)].filter(
      (hit) =>
        hit.index !== undefined &&
        !isExponent(tex, hit.index) &&
        !isRootIndex(tex, hit.index),
    );
    if (hits.length === 0) continue;
    let next = tex;
    for (let i = hits.length - 1; i >= 0; i -= 1) {
      const hit = hits[i]!;
      const at = hit.index ?? 0;
      next = `${next.slice(0, at)}${token}${next.slice(at + hit[0].length)}`;
    }
    return next;
  }
  return tex;
}

function slotifyTex(tex: string, values: Record<string, number>, wrap: boolean) {
  const names = Object.keys(values).sort((left, right) => {
    const a = String(values[left]);
    const b = String(values[right]);
    if (b.length !== a.length) return b.length - a.length;
    return (values[left]! < 0 ? 1 : 0) - (values[right]! < 0 ? 1 : 0);
  });
  let out = tex;
  for (const name of names) {
    const value = values[name];
    if (value === undefined) continue;
    out = replaceValue(out, value, wrap ? PLACEHOLDER(name) : name);
  }
  return out;
}

function intRangeAround(n: number) {
  const span = Math.max(4, Math.min(12, Math.abs(Math.trunc(n)) || 4));
  let lo = Math.trunc(n) - span;
  let hi = Math.trunc(n) + span;
  if (n > 0) lo = Math.max(1, lo);
  if (n < 0) hi = Math.min(-1, hi);
  if (lo > hi) {
    const swap = lo;
    lo = hi;
    hi = swap;
  }
  if (lo === hi) hi = n < 0 ? lo - 3 : lo + 3;
  if (lo > hi) {
    const swap = lo;
    lo = hi;
    hi = swap;
  }
  return {
    int: [lo, hi] as [number, number],
    ...(n !== 0 ? { nonzero: true as const } : {}),
  };
}

function skeletonOf(
  template: ProblemTemplate,
  problem: BankProblem,
): TemplateVariant | null {
  const kind = problem.kind ?? "";
  const slash = kind.indexOf("/");
  const id = slash === -1 ? "" : kind.slice(slash + 1).trim();
  if (id) {
    const named = template.variants.find((variant) => variant.id === id);
    if (named) return named;
  }
  const prompt = problem.promptTemplate?.trim() ?? "";
  if (prompt) {
    const byPrompt = template.variants.find(
      (variant) => variant.prompt === prompt,
    );
    if (byPrompt) return byPrompt;
  }
  return template.variants[0] ?? null;
}

function pickParamName(
  used: Set<string>,
  preferred?: string,
): string | null {
  if (preferred && NAME_OK.test(preferred) && !used.has(preferred)) {
    return preferred;
  }
  for (const name of PARAM_NAMES) {
    if (!used.has(name)) return name;
  }
  return null;
}

function preferExistingName(
  value: number,
  variables: Record<string, number> | undefined,
  used: Set<string>,
): string | undefined {
  if (!variables) return undefined;
  for (const [name, current] of Object.entries(variables)) {
    if (current === value && NAME_OK.test(name) && !used.has(name)) return name;
  }
  return undefined;
}

function candidateExprs(names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    out.push(
      `-${name}`,
      `2*${name}`,
      `${name}/2`,
      `${name}*2`,
      `${name}^2`,
      `sqrt(${name})`,
      `abs(${name})`,
      `1/${name}`,
      `${name}+1`,
      `${name}-1`,
      `(${name}+1)/2`,
    );
  }
  for (let i = 0; i < names.length; i += 1) {
    for (let j = 0; j < names.length; j += 1) {
      if (i === j) continue;
      const left = names[i]!;
      const right = names[j]!;
      out.push(
        `${left}+${right}`,
        `${left}-${right}`,
        `${left}*${right}`,
        `${left}/${right}`,
      );
    }
  }
  if (names.length >= 3) {
    const [a, b, c] = names;
    out.push(`${a}+${b}+${c}`, `${a}*${b}+${c}`, `${a}+${b}*${c}`);
  }
  return out;
}

function inferDerived(
  params: Record<string, number>,
  solutionTex: string,
): Record<string, string> {
  const leftovers = extractVaryableNumbers(solutionTex).filter(
    (value) => !Object.values(params).includes(value),
  );
  if (leftovers.length === 0) return {};

  const names = Object.keys(params);
  const exprs = candidateExprs(names).sort((a, b) => a.length - b.length);
  const derived: Record<string, string> = {};
  const used = new Set<string>(names);

  for (const value of leftovers) {
    let found: string | null = null;
    for (const expr of exprs) {
      const result = evaluateTemplateExpr(expr, params);
      if (!result.ok) continue;
      if (Math.abs(result.value - value) > 1e-8) continue;
      found = expr;
      break;
    }
    if (!found) continue;
    const name = DERIVED_NAMES.find((item) => !used.has(item));
    if (!name) break;
    used.add(name);
    derived[name] = found;
  }
  return derived;
}

function casFormula(
  problem: BankProblem,
  params: Record<string, number>,
): string | undefined {
  const raw = problem.formula?.trim();
  if (!raw) return undefined;
  const slotted = slotifyTex(raw, params, false);
  const entries = Object.entries(params).map(([name, value]) => ({
    name,
    value,
  }));
  if (verifyFormula(slotted, entries).ok) return slotted;
  const original = Object.entries(problem.variables ?? {}).map(
    ([name, value]) => ({ name, value }),
  );
  if (original.length > 0 && verifyFormula(raw, original).ok) return raw;
  return undefined;
}

function paramValues(
  problem: BankProblem,
  skeleton: TemplateVariant | null,
): Record<string, number> | null {
  const used = new Set<string>();
  const values: Record<string, number> = {};

  if (skeleton) {
    for (const name of Object.keys(skeleton.params)) {
      const current = problem.variables?.[name];
      if (typeof current === "number" && Number.isFinite(current)) {
        values[name] = current;
        used.add(name);
      }
    }
  }

  const alreadySlotted =
    HAS_SLOT.test(problem.promptTemplate ?? "") ||
    HAS_SLOT.test(skeleton?.prompt ?? "");
  if (alreadySlotted && Object.keys(values).length > 0) return values;

  const numbers = extractVaryableNumbers(problem.promptTex);
  for (const value of numbers) {
    if (Object.values(values).includes(value)) continue;
    const name = pickParamName(
      used,
      preferExistingName(value, problem.variables, used),
    );
    if (!name) break;
    used.add(name);
    values[name] = value;
  }

  return Object.keys(values).length > 0 ? values : null;
}

/**
 * Build a one-skeleton family from any generated/imported card so variants
 * can resample numbers and recompute the solution.
 */
export function templateFromProblem(
  problem: BankProblem,
  familyRaw?: unknown,
): ProblemTemplate | null {
  const parsed =
    familyRaw === undefined || familyRaw === null
      ? null
      : parseProblemTemplate(familyRaw);
  const skeleton =
    parsed?.success ? skeletonOf(parsed.data, problem) : null;
  const params = paramValues(problem, skeleton);
  if (!params) return null;

  const familyDerived = skeleton?.derived ?? {};
  const inferred =
    Object.keys(familyDerived).length > 0
      ? {}
      : inferDerived(params, problem.solutionTex);
  const derived = { ...familyDerived, ...inferred };
  const fillValues = { ...params };
  for (const [name, expr] of Object.entries(derived)) {
    const result = evaluateTemplateExpr(expr, params);
    if (result.ok) fillValues[name] = result.value;
  }

  const familyPrompt = skeleton?.prompt?.trim() ?? "";
  const prompt = HAS_SLOT.test(familyPrompt)
    ? familyPrompt
    : HAS_SLOT.test(problem.promptTemplate ?? "")
      ? problem.promptTemplate!
      : slotifyTex(problem.promptTex, params, true);
  if (!HAS_SLOT.test(prompt)) return null;

  const familySteps = skeleton?.solutionSteps;
  const familySolution = skeleton?.solution;
  const stepsHaveSlots = familySteps?.some((step) => HAS_SLOT.test(step));
  const solutionHasSlots = Boolean(
    familySolution && HAS_SLOT.test(familySolution),
  );
  const solutionTex = slotifyTex(problem.solutionTex, fillValues, true);
  const formula =
    skeleton?.formula?.trim() ||
    casFormula(problem, params) ||
    derived.ans ||
    Object.values(derived)[0];

  const specParams: TemplateVariant["params"] = {};
  for (const [name, value] of Object.entries(params)) {
    const existing = skeleton?.params[name];
    if (existing && "pick" in existing && existing.pick.length > 1) {
      specParams[name] = existing;
      continue;
    }
    if (!Number.isInteger(value)) {
      specParams[name] = { pick: [value, value + 1, value - 1] };
      continue;
    }
    specParams[name] = intRangeAround(value);
  }

  if (Object.values(specParams).every((spec) => "pick" in spec && spec.pick.length <= 1)) {
    const ranging = Object.values(specParams).some(
      (spec) => "int" in spec && spec.int[0] !== spec.int[1],
    );
    if (!ranging) return null;
  }

  const topic = asTopic(problem.topic);
  const difficulty = (PROBLEM_DIFFICULTIES as readonly string[]).includes(
    problem.difficulty,
  )
    ? problem.difficulty
    : "medium";
  const year = (PROBLEM_YEARS as readonly string[]).includes(problem.year)
    ? problem.year
    : "9";

  return {
    id: (problem.templateId || "auto-slot").slice(0, 64),
    topic,
    difficulties: [difficulty],
    years: [year],
    instructionId: problem.instructionId,
    variants: [
      {
        id: "main",
        params: specParams,
        derived,
        constraints: [],
        prompt,
        ...(stepsHaveSlots
          ? { solutionSteps: familySteps }
          : solutionHasSlots
            ? { solution: familySolution }
            : { solution: solutionTex }),
        ...(formula ? { formula } : {}),
      },
    ],
  };
}
