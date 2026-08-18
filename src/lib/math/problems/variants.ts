import { numberToTex, verifyFormula } from "./cas";
import { polishStudentTex, tidySignedTex } from "./tex";
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

export function canVary(problem: BankProblem) {
  return Boolean(
    problem.formula &&
      problem.variables &&
      Object.keys(problem.variables).length > 0,
  );
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
  seed?: number,
): BankProblem[] {
  if (!canVary(source) || !source.formula || !source.variables) return [];

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
  const root = seed ?? (Date.now() ^ Math.floor(Math.random() * 0x7fffffff));
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
