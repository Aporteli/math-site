import type { Locale } from "@/i18n/config";
import { generateFromTemplate } from "./algorithms";
import { numberToTex, verifyFormula } from "./cas";
import { polishStudentTex, tidySignedTex } from "./tex";
import { parseProblemTemplate } from "./templates/adapt";
import { extractVaryableNumbers, templateFromProblem } from "./templates/auto-slots";
import type { LeafParamSpec, ParamSpec, ProblemTemplate, TemplateVariant } from "./templates/schema";
import type { BankProblem } from "./types";
import {
  applyRecipe,
  ensureVariableSlots,
  fingerprint,
  mulberry32,
  recipesFor,
  rollVaryLimits,
  shapeKey,
  unwrapOuter,
} from "./variant-mutate";

const PLACEHOLDER = (name: string) => `{{${name}}}`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function numberSnippets(value: number): string[] {
  if (Number.isInteger(value)) {
    if (value < 0) return [`${value}`, `- ${Math.abs(value)}`];
    return [String(value)];
  }
  return [String(value), numberToTex(value)];
}

export function canVary(problem: BankProblem, template?: unknown) {
  if (template != null && template !== "") return true;
  if (
    problem.promptTemplate &&
    problem.variables &&
    Object.keys(problem.variables).length > 0 &&
    templateHasAll(problem.promptTemplate, problem.variables)
  ) {
    return true;
  }
  if (
    problem.formula &&
    problem.variables &&
    Object.keys(problem.variables).length > 0
  ) {
    return true;
  }
  return extractVaryableNumbers(problem.promptTex).length > 0;
}

export function canResampleProblem(
  problem: BankProblem,
  familyRaw?: unknown,
): boolean {
  if (familyRaw != null && familyCanResample(familyRaw, problem)) return true;
  return templateFromProblem(problem, familyRaw) != null;
}

function specCanVary(spec: ParamSpec): boolean {
  if ("int" in spec) return spec.int[0] !== spec.int[1];
  if ("pick" in spec) return spec.pick.length > 1;
  return Object.values(spec.byDifficulty).some(
    (leaf) => leaf != null && specCanVary(leaf),
  );
}

function intRangeAround(
  n: number,
  base?: Extract<LeafParamSpec, { int: [number, number] }>,
): Extract<LeafParamSpec, { int: [number, number] }> {
  const span = Math.max(4, Math.min(12, Math.abs(n) || 4));
  let lo = n - span;
  let hi = n + span;
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
    int: [lo, hi],
    ...(base?.nonzero ?? n !== 0 ? { nonzero: true } : {}),
    ...(base?.exclude && base.exclude.length > 0
      ? { exclude: base.exclude }
      : {}),
  };
}

function widenLeaf(spec: LeafParamSpec, current?: number): LeafParamSpec {
  if ("pick" in spec) {
    if (spec.pick.length > 1) return spec;
    const only = spec.pick[0];
    if (typeof only === "number" && Number.isInteger(only)) {
      return intRangeAround(current ?? only);
    }
    return spec;
  }
  if (spec.int[0] !== spec.int[1]) return spec;
  return intRangeAround(current ?? spec.int[0], spec);
}

function widenSpec(spec: ParamSpec, current?: number): ParamSpec {
  if ("byDifficulty" in spec) {
    return {
      byDifficulty: {
        easy: spec.byDifficulty.easy
          ? widenLeaf(spec.byDifficulty.easy, current)
          : undefined,
        medium: spec.byDifficulty.medium
          ? widenLeaf(spec.byDifficulty.medium, current)
          : undefined,
        hard: spec.byDifficulty.hard
          ? widenLeaf(spec.byDifficulty.hard, current)
          : undefined,
        olympiad: spec.byDifficulty.olympiad
          ? widenLeaf(spec.byDifficulty.olympiad, current)
          : undefined,
      },
    };
  }
  return widenLeaf(spec, current);
}

function pinnedSkeleton(
  template: ProblemTemplate,
  source?: BankProblem,
): TemplateVariant | null {
  if (!source) return template.variants[0] ?? null;
  const fromKind = skeletonId(source);
  if (fromKind) {
    const named = template.variants.find((variant) => variant.id === fromKind);
    if (named) return named;
  }
  const prompt = source.promptTemplate?.trim() ?? "";
  if (prompt) {
    const byPrompt = template.variants.find(
      (variant) => variant.prompt === prompt,
    );
    if (byPrompt) return byPrompt;
  }
  return template.variants[0] ?? null;
}

/** One skeleton, widened ranges — never the family's other existing types. */
function resampleFamily(template: ProblemTemplate, source: BankProblem): unknown {
  const variant = pinnedSkeleton(template, source);
  if (!variant) return null;
  const vars = source.variables ?? {};
  const params: TemplateVariant["params"] = {};
  for (const [name, spec] of Object.entries(variant.params)) {
    params[name] = widenSpec(spec, vars[name]);
  }
  return {
    ...template,
    variants: [
      {
        ...variant,
        params,
        example: undefined,
      },
    ],
  };
}

export function familyCanResample(raw: unknown, source?: BankProblem): boolean {
  const parsed = parseProblemTemplate(raw);
  if (!parsed.success) return false;
  const variant = pinnedSkeleton(parsed.data, source);
  if (!variant) return false;
  const vars = source?.variables ?? {};
  return Object.entries(variant.params).some(([name, spec]) =>
    specCanVary(widenSpec(spec, vars[name])),
  );
}

function familyRecord(raw: string): {
  id?: unknown;
  variants?: { prompt?: unknown }[];
} | null {
  try {
    const parsed = JSON.parse(raw) as {
      id?: unknown;
      variants?: { prompt?: unknown }[];
    };
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function templateJsonForProblem(
  problem: BankProblem,
  families: readonly { slug: string; json: string }[],
): string | null {
  const kind = problem.kind ?? "";
  const templateId = problem.templateId;
  const promptTemplate = problem.promptTemplate?.trim() ?? "";

  const hit = families.find((family) => {
    if (family.slug === templateId) return true;
    if (kind === family.slug || kind.startsWith(`${family.slug}/`)) return true;
    const parsed = familyRecord(family.json);
    if (!parsed) return false;
    const id = typeof parsed.id === "string" ? parsed.id : "";
    if (id && (id === templateId || kind === id || kind.startsWith(`${id}/`))) {
      return true;
    }
    return Boolean(
      promptTemplate &&
        parsed.variants?.some((variant) => variant.prompt === promptTemplate),
    );
  });
  return hit?.json ?? null;
}

function skeletonId(problem: BankProblem): string | undefined {
  const kind = problem.kind ?? "";
  const slash = kind.indexOf("/");
  if (slash === -1) return undefined;
  const id = kind.slice(slash + 1).trim();
  return id || undefined;
}

export function stampFamilySource(
  problems: BankProblem[],
  family: { slug: string },
): BankProblem[] {
  return problems.map((item) => {
    const tail = skeletonId(item);
    return {
      ...item,
      templateId: family.slug,
      kind: tail ? `${family.slug}/${tail}` : family.slug,
    };
  });
}

function parseTemplateJson(raw: unknown): unknown | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function sampleFamilyBatch(
  template: unknown,
  source: BankProblem,
  count: number,
  seed: number,
  locale: Locale | undefined,
): BankProblem[] {
  try {
    return generateFromTemplate(
      template,
      {
        count,
        locale,
        difficulty: source.difficulty,
        year: source.year,
        seed,
      },
      { pinVariant: true, variantIndex: 0 },
    );
  } catch {
    return [];
  }
}

function variantsFromFamily(
  source: BankProblem,
  template: unknown,
  count: number,
  seed: number,
  locale?: Locale,
): BankProblem[] {
  const parsed = parseProblemTemplate(template);
  if (!parsed.success) return [];
  const one = resampleFamily(parsed.data, source);
  if (one == null) return [];

  const target = Math.min(12, Math.max(1, Math.floor(count)));
  const used = new Set([source.promptTex]);
  const out: BankProblem[] = [];

  for (let round = 0; round < 16 && out.length < target; round += 1) {
    const batch = sampleFamilyBatch(
      one,
      source,
      target,
      seed + round * 100_003,
      locale,
    );
    for (const item of batch) {
      if (used.has(item.promptTex)) continue;
      used.add(item.promptTex);
      out.push({
        ...item,
        topic: source.topic,
        difficulty: source.difficulty,
        year: source.year,
        templateId: source.templateId,
        kind: source.kind,
        id: `var-${source.kind ?? source.templateId}-${item.seed ?? seed}-${out.length}`,
      });
      if (out.length >= target) break;
    }
  }

  return out;
}

export function templateHasAll(
  template: string,
  variables: Record<string, number>,
) {
  return Object.keys(variables).every((name) =>
    template.includes(PLACEHOLDER(name)),
  );
}

/** Turn a numeric prompt into a reusable template with `{{name}}` slots. */
export function derivePromptTemplate(
  promptTex: string,
  variables: Record<string, number>,
): string | null {
  const names = Object.keys(variables).sort((a, b) => {
    const aText = String(variables[a]);
    const bText = String(variables[b]);
    if (bText.length !== aText.length) return bText.length - aText.length;
    const aNeg = (variables[a] ?? 0) < 0 ? 1 : 0;
    const bNeg = (variables[b] ?? 0) < 0 ? 1 : 0;
    if (bNeg !== aNeg) return bNeg - aNeg;
    return b.length - a.length;
  });

  let template = promptTex;
  for (const name of names) {
    const value = variables[name];
    if (value === undefined) return null;
    let replaced = false;
    for (const snippet of numberSnippets(value)) {
      const re = new RegExp(`(?<![0-9.])${escapeRegExp(snippet)}(?![0-9.])`);
      if (re.test(template)) {
        template = template.replace(re, PLACEHOLDER(name));
        replaced = true;
        break;
      }
    }
    if (!replaced) return null;
  }

  return templateHasAll(template, variables) ? template : null;
}

export function fillPromptTemplate(
  template: string,
  variables: Record<string, number>,
) {
  if (templateHasAll(template, variables)) {
    let filled = template;
    for (const [name, value] of Object.entries(variables)) {
      filled = filled.replaceAll(PLACEHOLDER(name), numberToTex(value));
    }
    return polishStudentTex(tidySignedTex(filled));
  }

  return Object.entries(variables)
    .map(([name, value]) => `\\mathrm{${name}} = ${numberToTex(value)}`)
    .join(",\\; ");
}

export function generateVariants(
  source: BankProblem,
  count: number,
  seedOrOptions?: number | {
    seed?: number;
    template?: unknown;
    locale?: Locale;
  },
): BankProblem[] {
  const options =
    typeof seedOrOptions === "number"
      ? { seed: seedOrOptions }
      : (seedOrOptions ?? {});
  const root =
    options.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x7fffffff));
  const familyTemplate = parseTemplateJson(options.template);
  if (familyTemplate != null) {
    const fromFamily = variantsFromFamily(
      source,
      familyTemplate,
      count,
      root,
      options.locale,
    );
    if (fromFamily.length > 0) return fromFamily;
  }

  const auto = templateFromProblem(source, familyTemplate ?? undefined);
  if (auto) {
    const fromAuto = variantsFromFamily(
      source,
      auto,
      count,
      root,
      options.locale,
    );
    if (fromAuto.length > 0) return fromAuto;
  }

  if (!source.formula || !source.variables) return [];

  const originalVars = source.variables;
  const template =
    source.promptTemplate && templateHasAll(source.promptTemplate, originalVars)
      ? source.promptTemplate
      : (derivePromptTemplate(source.promptTex, originalVars) ?? "");

  const core = unwrapOuter({
    formula: source.formula,
    variables: originalVars,
    promptTex: source.promptTex,
    promptTemplate: template || source.promptTemplate,
    instructionId: source.instructionId,
  });
  if (Object.keys(core.variables).length === 0) return [];

  const original = core.variables;
  const recipes = recipesFor(core.instructionId);
  const limits = rollVaryLimits(mulberry32(root ^ 0x9e3779b9));
  const used = new Set([fingerprint(core.formula, original)]);
  const seenShapes = new Set([shapeKey(core.formula)]);
  const variants: BankProblem[] = [];
  const extras: BankProblem[] = [];
  const target = Math.min(12, Math.max(1, Math.floor(count)));
  const attempts = Math.max(80, target * 24);

  for (let i = 0; i < attempts && variants.length + extras.length < target * 3; i += 1) {
    const rng = mulberry32(root + i * 7919);
    const recipe = recipes[i % recipes.length];
    if (!recipe) continue;

    const jittered = {
      ...limits,
      absMax: Math.min(24, limits.absMax + (i % 3)),
    };

    const state = applyRecipe(core, recipe, jittered, rng);
    if (!state) continue;

    const key = fingerprint(state.formula, state.variables);
    if (used.has(key)) continue;

    const cas = verifyFormula(
      state.formula,
      Object.entries(state.variables).map(([name, value]) => ({ name, value })),
    );
    if (!cas.ok) continue;

    used.add(key);
    const promptTemplate =
      (state.promptTemplate &&
      templateHasAll(state.promptTemplate, state.variables)
        ? state.promptTemplate
        : derivePromptTemplate(state.promptTex, state.variables)) ?? undefined;
    const promptTex = promptTemplate
      ? fillPromptTemplate(promptTemplate, state.variables)
      : state.promptTex;

    const variantSeed = root + i;
    const item: BankProblem = {
      id: `var-${source.kind ?? source.templateId}-${variantSeed}-${variants.length + extras.length}`,
      templateId: "ai-verified",
      topic: source.topic,
      difficulty: source.difficulty,
      year: source.year,
      source: "generated",
      instructionId: source.instructionId,
      promptTex,
      solutionTex: cas.solutionTex,
      seed: variantSeed,
      kind: source.kind,
      formula: state.formula,
      variables: state.variables,
      promptTemplate,
    };

    const shape = shapeKey(state.formula);
    if (!seenShapes.has(shape) && variants.length < target) {
      seenShapes.add(shape);
      variants.push(item);
    } else {
      extras.push(item);
    }
  }

  for (const item of extras) {
    if (variants.length >= target) break;
    variants.push(item);
  }

  return variants.slice(0, target);
}

export { ensureVariableSlots };
