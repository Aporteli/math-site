import { numberToTex, verifyFormula } from "./cas";
import type { BankProblem } from "./types";

const PLACEHOLDER = (name: string) => `{{${name}}}`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
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
    return filled;
  }

  return Object.entries(variables)
    .map(([name, value]) => `\\mathrm{${name}} = ${numberToTex(value)}`)
    .join(",\\; ");
}

function similarInteger(rng: () => number, original: number) {
  const magnitude = Math.max(3, Math.abs(Math.round(original)) + 4);
  const preferNegative = original < 0;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    let next = randInt(rng, 1, magnitude);
    const negative =
      rng() < (preferNegative ? 0.7 : 0.25) || (original === 0 && rng() < 0.5);
    if (negative) next = -next;
    if (next !== original) return next;
  }

  return original === 0 ? 1 : -original;
}

function fingerprint(variables: Record<string, number>) {
  return Object.keys(variables)
    .sort()
    .map((name) => `${name}:${variables[name]}`)
    .join("|");
}

function randomizeVariables(
  rng: () => number,
  original: Record<string, number>,
) {
  const next: Record<string, number> = {};
  for (const [name, value] of Object.entries(original)) {
    next[name] = Number.isInteger(value)
      ? similarInteger(rng, value)
      : similarInteger(rng, Math.round(value) || 1);
  }
  return next;
}

export function generateVariants(
  source: BankProblem,
  count: number,
  seed?: number,
): BankProblem[] {
  if (!canVary(source) || !source.formula || !source.variables) return [];

  const formula = source.formula;
  const original = source.variables;
  const template =
    source.promptTemplate && templateHasAll(source.promptTemplate, original)
      ? source.promptTemplate
      : (derivePromptTemplate(source.promptTex, original) ?? "");

  const root = seed ?? (Date.now() ^ Math.floor(Math.random() * 0x7fffffff));
  const used = new Set([fingerprint(original)]);
  const variants: BankProblem[] = [];
  const target = Math.min(12, Math.max(1, Math.floor(count)));

  for (let i = 0; i < target * 16 && variants.length < target; i += 1) {
    const rng = mulberry32(root + i * 7919);
    const variables = randomizeVariables(rng, original);
    const key = fingerprint(variables);
    if (used.has(key)) continue;

    const cas = verifyFormula(
      formula,
      Object.entries(variables).map(([name, value]) => ({ name, value })),
    );
    if (!cas.ok) continue;

    used.add(key);
    const variantSeed = root + i;
    variants.push({
      id: `var-${source.kind ?? source.templateId}-${variantSeed}-${variants.length}`,
      templateId: "ai-verified",
      topic: source.topic,
      difficulty: source.difficulty,
      year: source.year,
      source: "generated",
      instructionId: source.instructionId,
      promptTex: fillPromptTemplate(template, variables),
      solutionTex: cas.solutionTex,
      seed: variantSeed,
      kind: source.kind,
      formula,
      variables,
      promptTemplate: template || undefined,
    });
  }

  return variants;
}
