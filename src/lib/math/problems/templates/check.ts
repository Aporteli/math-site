import { verifyFormula } from "../cas";
import type { BankProblem } from "../types";
import { parseProblemTemplate } from "./adapt";
import type { TemplateVariant } from "./schema";

const SLOT_NAME = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}\}/g;
const IDENT = /[A-Za-z][A-Za-z0-9_]{0,23}/g;

export function lastAnswerSlot(variant: TemplateVariant): string | null {
  const texts = [...(variant.solutionSteps ?? []), variant.solution ?? ""];
  for (let i = texts.length - 1; i >= 0; i -= 1) {
    const names = [...texts[i]!.matchAll(SLOT_NAME)].map((match) => match[1]!);
    if (names.length > 0) return names[names.length - 1]!;
  }
  return null;
}

/** math.js expression for the numeric answer (unrendered). */
export function inferTemplateFormula(variant: TemplateVariant): string | null {
  const explicit = variant.formula?.trim();
  if (explicit) return explicit;
  const slot = lastAnswerSlot(variant);
  if (!slot) return null;
  const derived = variant.derived[slot];
  if (derived) return derived;
  if (slot in variant.params) return slot;
  return null;
}

function formulaVariables(
  formula: string,
  all: Record<string, number>,
): { name: string; value: number }[] {
  const names = new Set(formula.match(IDENT) ?? []);
  const entries: { name: string; value: number }[] = [];
  for (const name of names) {
    if (name in all) entries.push({ name, value: all[name]! });
    if (entries.length >= 12) break;
  }
  return entries;
}

export type TemplateCasCheck =
  | { ok: true; value: number; expected: number }
  | {
      ok: false;
      reason: "no_formula" | "cas" | "mismatch";
      got?: number;
      expected?: number;
    };

/** Recompute the answer with math.js and compare it to the sampled derived value. */
export function checkTemplateProblem(
  raw: unknown,
  problem: BankProblem,
): TemplateCasCheck {
  const parsed = parseProblemTemplate(raw);
  if (!parsed.success) return { ok: false, reason: "no_formula" };

  const variant =
    parsed.data.variants.find(
      (item) => item.id != null && problem.kind?.includes(item.id),
    ) ?? parsed.data.variants[0];
  if (!variant) return { ok: false, reason: "no_formula" };

  const formula = inferTemplateFormula(variant);
  const all = problem.variables ?? {};
  if (!formula || Object.keys(all).length === 0) {
    return { ok: false, reason: "no_formula" };
  }

  const entries = formulaVariables(formula, all);
  const cas = verifyFormula(formula, entries);
  if (!cas.ok) return { ok: false, reason: "cas" };

  const slot = lastAnswerSlot(variant);
  const expected =
    slot != null && typeof all[slot] === "number" ? all[slot] : cas.value;
  if (Math.abs(cas.value - expected) > 1e-8) {
    return { ok: false, reason: "mismatch", got: cas.value, expected };
  }
  return { ok: true, value: cas.value, expected };
}

/** Check a generated card: family JSON when present, else the problem's own formula. */
export function checkBankProblem(
  problem: BankProblem,
  familyJson?: string | null,
): TemplateCasCheck {
  if (familyJson) {
    try {
      const parsed = JSON.parse(familyJson) as unknown;
      const result = checkTemplateProblem(parsed, problem);
      if (result.ok || result.reason !== "no_formula") return result;
    } catch {
      /* Fall through to the instance formula. */
    }
  }

  const formula = problem.formula?.trim();
  const all = problem.variables ?? {};
  if (!formula || Object.keys(all).length === 0) {
    return { ok: false, reason: "no_formula" };
  }

  const entries = formulaVariables(formula, all);
  const cas = verifyFormula(formula, entries);
  if (!cas.ok) return { ok: false, reason: "cas" };
  return { ok: true, value: cas.value, expected: cas.value };
}
