import { evaluateTemplateExpr, numberToTex } from '../cas';
import { polishStudentTex } from '../tex';
import { aligned, linear, monomial, signed, texFrac } from '../algorithms/algebra/helpers';
import { nonzero, pick, randInt } from '../algorithms/rng';
import { problem } from '../algorithms/types';
import type { AlgorithmContext, GeneratedProblem, ProblemAlgorithm } from '../algorithms/types';
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_YEARS,
  toGeneratorDifficulty,
  type GeneratorDifficulty,
  type ProblemDifficulty,
  type ProblemYear,
} from '../types';
import { parseProblemTemplateOrThrow } from './adapt';
import { inferTemplateFormula } from './check';
import { closeParamIndexSlots, exprUsesOnlyKnownNames } from './slot-markup';
import type { LeafParamSpec, ParamSpec, ProblemTemplate, TemplateVariant } from './schema';
import { expandWorkRateFamily } from './work-rate';

const SAMPLE_RETRIES = 80;
const INT_RETRIES = 64;
/** Innermost `{{...}}` only — so LaTeX `x^{{{p}}}` becomes `x^{2}`, not slot `{p`. */
const SLOT = /\{\{\s*([^{}]+?)\s*\}\}/g;
const INT_LITERAL = /^-?\d+$/;
const FORMATTERS = new Set(['linear', 'signed', 'texFrac', 'abs', 'lead', 'term']);

type SlotValue = number | string;

function isIntParam(spec: LeafParamSpec): spec is Extract<LeafParamSpec, { int: [number, number] }> {
  return 'int' in spec;
}

function sampleLeaf(spec: LeafParamSpec, rng: () => number): SlotValue {
  if (!isIntParam(spec)) {
    return pick(rng, spec.pick);
  }

  const [min, max] = spec.int;
  const excluded = new Set(spec.exclude ?? []);
  for (let attempt = 0; attempt < INT_RETRIES; attempt += 1) {
    const n = spec.nonzero ? nonzero(rng, min, max) : randInt(rng, min, max);
    if (!excluded.has(n)) return n;
  }
  throw new Error('int sample exhausted');
}

function leafForDifficulty(spec: ParamSpec, difficulty: GeneratorDifficulty): LeafParamSpec {
  if (!('byDifficulty' in spec)) return spec;
  const chosen =
    spec.byDifficulty[difficulty] ??
    spec.byDifficulty.hard ??
    spec.byDifficulty.olympiad ??
    spec.byDifficulty.easy ??
    spec.byDifficulty.medium;
  if (!chosen) {
    throw new Error(`no param spec for difficulty ${difficulty}`);
  }
  return chosen;
}

function exampleFits(spec: ParamSpec, value: SlotValue, difficulty: GeneratorDifficulty): boolean {
  const leaf = leafForDifficulty(spec, difficulty);
  if (isIntParam(leaf)) {
    if (typeof value !== 'number' || !Number.isInteger(value)) return false;
    const [min, max] = leaf.int;
    if (value < min || value > max) return false;
    if (leaf.nonzero && value === 0) return false;
    if (leaf.exclude?.includes(value)) return false;
    return true;
  }
  return leaf.pick.some((item) => item === value);
}

function sampleParams(variant: TemplateVariant, ctx: AlgorithmContext, useExample: boolean): Record<string, SlotValue> {
  const values: Record<string, SlotValue> = {};
  for (const [name, spec] of Object.entries(variant.params)) {
    const anchored = useExample ? variant.example?.[name] : undefined;
    if (anchored !== undefined && exampleFits(spec, anchored, ctx.difficulty)) {
      values[name] = anchored;
      continue;
    }
    values[name] = sampleLeaf(leafForDifficulty(spec, ctx.difficulty), ctx.rng);
  }
  return values;
}

function numericScope(values: Record<string, SlotValue>): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'number') scope[name] = value;
  }
  return scope;
}

function interpolateDerivedString(expr: string, scope: Record<string, number>): string {
  return expr.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g, (name) => {
    if (!Object.hasOwn(scope, name)) return name;
    const value = scope[name]!;
    return Number.isInteger(value) ? String(value) : String(value);
  });
}

function applyDerived(variant: TemplateVariant, values: Record<string, SlotValue>): boolean {
  for (const [name, expr] of Object.entries(variant.derived)) {
    const result = evaluateTemplateExpr(expr, numericScope(values));
    if (!result.ok) {
      if (result.reason === 'sym') {
        values[name] = interpolateDerivedString(expr, numericScope(values));
        continue;
      }
      if (result.reason === 'unsafe') {
        values[name] = interpolateDerivedString(expr, numericScope(values));
        continue;
      }
      if (result.reason === 'unclean' || result.reason === 'nonreal') {
        return false;
      }
      throw new Error(`derived ${name}: ${result.reason}`);
    }
    values[name] = result.value;
  }
  return true;
}

function constraintsHold(variant: TemplateVariant, values: Record<string, SlotValue>) {
  const scope = numericScope(values);
  for (const expr of variant.constraints) {
    const result = evaluateTemplateExpr(expr, scope);
    if (!result.ok) {
      if (result.reason === 'unclean' || result.reason === 'nonreal') {
        return false;
      }
      throw new Error(`constraint ${expr}: ${result.reason}`);
    }
    if (result.value === 0) return false;
  }
  return true;
}

function resolveArg(token: string, values: Record<string, SlotValue>, asLiteral = false): SlotValue {
  if (token in values) return values[token]!;
  if (INT_LITERAL.test(token)) return Number(token);
  if (asLiteral) return token;
  throw new Error(`unknown slot ${token}`);
}

function asNumber(value: SlotValue, label: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${label} is not a number`);
  }
  return value;
}

function asLetter(value: SlotValue): string {
  return typeof value === 'string' ? value : String(value);
}

function formatValue(value: SlotValue): string {
  if (typeof value === 'string') return value;
  return numberToTex(value);
}

function formatPolyTerm(coef: number, body: string, leading: boolean) {
  if (coef === 0) return '';
  const piece = monomial(coef, body);
  if (leading) return coef < 0 ? `-${piece}` : piece;
  return coef < 0 ? `- ${piece}` : `+ ${piece}`;
}

function termBody(args: SlotValue[]) {
  return args
    .slice(1)
    .map((value) => (typeof value === 'string' ? value : formatValue(value)))
    .join('');
}

function applyFormatter(name: string, args: SlotValue[]): string {
  switch (name) {
    case 'linear': {
      if (args.length !== 3) throw new Error('linear needs a b v');
      return linear(asNumber(args[0]!, 'linear a'), asNumber(args[1]!, 'linear b'), asLetter(args[2]!));
    }
    case 'signed': {
      if (args.length !== 1) throw new Error('signed needs n');
      return signed(asNumber(args[0]!, 'signed n'));
    }
    case 'texFrac': {
      if (args.length !== 2) throw new Error('texFrac needs n d');
      return texFrac(asNumber(args[0]!, 'texFrac n'), asNumber(args[1]!, 'texFrac d'));
    }
    case 'abs': {
      if (args.length !== 1) throw new Error('abs needs n');
      return `\\left|${formatValue(args[0]!)}\\right|`;
    }
    case 'lead': {
      if (args.length < 1) throw new Error('lead needs coef');
      return formatPolyTerm(asNumber(args[0]!, 'lead coef'), termBody(args), true);
    }
    case 'term': {
      if (args.length < 1) throw new Error('term needs coef');
      return formatPolyTerm(asNumber(args[0]!, 'term coef'), termBody(args), false);
    }
    default:
      throw new Error(`unknown formatter ${name}`);
  }
}

function renderExprSlot(expr: string, values: Record<string, SlotValue>): string {
  const result = evaluateTemplateExpr(expr, numericScope(values));
  if (!result.ok) {
    throw new Error(`unknown slot ${expr}`);
  }
  return formatValue(result.value);
}

/**
 * `T_{{{r}+1}}` / `T_{{{r} + 1}}` closes the slot too early.
 * Rewrite to `{{r + 1}}` so it evaluates (e.g. T_{3}).
 */
const BROKEN_EXPR_SLOT = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}(?!\})(\s*[+\-*/^]\s*[^}]*?)\}\}/g;
const MATRIX_SIZE_SLOT =
  /_\{+\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}\s*\\times\s*\{+\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}+/g;
const ADJACENT_SLOTS = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}\}\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}\}/g;

function rewriteBrokenSlots(template: string, values: Record<string, SlotValue>): string {
  const names = new Set(Object.keys(values));
  const known = (name: string) => names.has(name);
  let out = template.replace(MATRIX_SIZE_SLOT, (full, a: string, b: string) =>
    known(a) && known(b) ? `_{{{${a}}} \\times {{${b}}}}` : full,
  );
  out = closeParamIndexSlots(out, names);
  out = out.replace(BROKEN_EXPR_SLOT, (full, name: string, rest: string, offset: number) => {
    if (!known(name) || !exprUsesOnlyKnownNames(rest, names)) return full;
    const wrapped = offset > 0 && out[offset - 1] === '{';
    const alreadyClosed = out[offset + full.length] === '}';
    const closer = wrapped && !alreadyClosed ? '}' : '';
    return `{{${name}${rest}}}${closer}`;
  });
  out = out.replace(ADJACENT_SLOTS, (full, a: string, b: string) =>
    known(a) && known(b) ? `{{${a}}}\\cdot{{${b}}}` : full,
  );
  return out;
}

function render(template: string, values: Record<string, SlotValue>): string {
  return rewriteBrokenSlots(template, values).replace(SLOT, (_, inner: string) => {
    const trimmed = inner.trim();
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) throw new Error('empty slot');

    const head = tokens[0]!;
    if (tokens.length > 1 && FORMATTERS.has(head)) {
      const argTokens = tokens.slice(1);
      const literalArgs = head === 'term' || head === 'lead';
      return applyFormatter(
        head,
        argTokens.map((token, index) => resolveArg(token, values, literalArgs && index > 0)),
      );
    }

    if (tokens.length === 1 && (head in values || INT_LITERAL.test(head))) {
      return formatValue(resolveArg(head, values));
    }

    return renderExprSlot(trimmed, values);
  });
}

function variantYears(variant: TemplateVariant, template: ProblemTemplate) {
  return variant.years?.length ? variant.years : template.years;
}

function variantDifficulties(variant: TemplateVariant, template: ProblemTemplate) {
  return variant.difficulties?.length ? variant.difficulties : template.difficulties;
}

export function matchingTemplateVariants(
  template: ProblemTemplate,
  filters: { difficulty?: ProblemDifficulty; year?: ProblemYear } = {},
): TemplateVariant[] {
  return template.variants.filter((variant) => {
    if (filters.difficulty) {
      const diffs = variantDifficulties(variant, template);
      if (!diffs.includes(filters.difficulty)) return false;
    }
    if (filters.year) {
      const years = variantYears(variant, template);
      if (!years.includes(filters.year)) return false;
    }
    return true;
  });
}

export function classifyTemplateGenerateFilter(
  raw: unknown,
  filters: { difficulty?: ProblemDifficulty; year?: ProblemYear } = {},
): 'ok' | 'empty' | 'no_match' {
  try {
    const template = expandWorkRateFamily(parseProblemTemplateOrThrow(raw));
    if (template.variants.length === 0) return 'empty';
    return matchingTemplateVariants(template, filters).length > 0 ? 'ok' : 'no_match';
  } catch {
    return 'empty';
  }
}

export function matchingTemplateCount(
  raw: unknown,
  filters: { difficulty?: ProblemDifficulty; year?: ProblemYear } = {},
): number {
  try {
    const template = expandWorkRateFamily(parseProblemTemplateOrThrow(raw));
    return matchingTemplateVariants(template, filters).length;
  } catch {
    return 0;
  }
}

export function collectTemplateGenerateLabels(raw: unknown): {
  years: ProblemYear[];
  difficulties: ProblemDifficulty[];
} {
  try {
    const template = expandWorkRateFamily(parseProblemTemplateOrThrow(raw));
    const years = new Set<ProblemYear>();
    const difficulties = new Set<ProblemDifficulty>();
    for (const variant of template.variants) {
      for (const year of variantYears(variant, template)) years.add(year);
      for (const difficulty of variantDifficulties(variant, template)) {
        difficulties.add(difficulty);
      }
    }
    return {
      years: PROBLEM_YEARS.filter((year) => years.has(year)),
      difficulties: PROBLEM_DIFFICULTIES.filter((difficulty) => difficulties.has(difficulty)),
    };
  } catch {
    return { years: [], difficulties: [] };
  }
}

function stampVariantLabels(
  variant: TemplateVariant,
  template: ProblemTemplate,
  ctx: AlgorithmContext,
): { year: ProblemYear; difficulty: ProblemDifficulty } {
  const years = variantYears(variant, template);
  const diffs = variantDifficulties(variant, template);
  const year = ctx.filterYear && years.includes(ctx.filterYear) ? ctx.filterYear : (years[0] ?? ctx.year);
  const difficulty: ProblemDifficulty =
    ctx.filterDifficulty && diffs.includes(ctx.filterDifficulty)
      ? ctx.filterDifficulty
      : (diffs[0] ?? ctx.filterDifficulty ?? 'medium');
  return { year, difficulty };
}

function pickVariant(ctx: AlgorithmContext, template: ProblemTemplate): TemplateVariant | null {
  const variants = template.variants;
  const first = variants[0];
  if (!first) return null;
  if (ctx.variantId) {
    return variants.find((variant) => variant.id === ctx.variantId) ?? first;
  }
  const pool = ctx.skipMatchFilter
    ? variants
    : matchingTemplateVariants(template, {
        difficulty: ctx.filterDifficulty,
        year: ctx.filterYear,
      });
  if (pool.length === 0) return null;
  if (ctx.anchorExample) {
    return (
      pool.find((variant) => variant.example != null && Object.keys(variant.example).length > 0) ?? pool[0] ?? null
    );
  }
  if (ctx.variantIndex != null) {
    return pool[ctx.variantIndex % pool.length] ?? null;
  }
  return pick(ctx.rng, pool);
}

function instantiateVariant(
  template: ProblemTemplate,
  variant: TemplateVariant,
  ctx: AlgorithmContext,
): GeneratedProblem {
  const label = variant.id ? `${template.id}/${variant.id}` : template.id;

  for (let attempt = 0; attempt < SAMPLE_RETRIES; attempt += 1) {
    const values = sampleParams(variant, ctx, Boolean(ctx.anchorExample) && attempt === 0);
    if (!applyDerived(variant, values)) continue;
    if (!constraintsHold(variant, values)) continue;

    const promptTex = polishStudentTex(render(variant.prompt, values));
    const solutionTex = polishStudentTex(
      variant.solutionSteps
        ? aligned(variant.solutionSteps.map((step) => render(step, values)))
        : render(variant.solution ?? '', values),
    );

    const formula = inferTemplateFormula(variant);
    return problem({
      instructionId: template.instructionId,
      promptTex,
      solutionTex,
      promptTemplate: variant.prompt,
      formula: formula ?? '',
      variables: numericScope(values),
    });
  }

  throw new Error(`template ${label}: sampling failed after ${SAMPLE_RETRIES} retries`);
}

export function compileTemplate(raw: unknown): ProblemAlgorithm {
  const template = expandWorkRateFamily(parseProblemTemplateOrThrow(raw));
  return {
    id: template.id,
    topic: template.topic,
    difficulties: template.difficulties,
    years: template.years,
    variantCount: template.variants.length,
    generate(ctx) {
      const variant = pickVariant(ctx, template);
      if (!variant) {
        throw new Error('NO_TEMPLATE_MATCH');
      }
      const labels = stampVariantLabels(variant, template, ctx);
      const sampled = instantiateVariant(template, variant, {
        ...ctx,
        difficulty: toGeneratorDifficulty(labels.difficulty),
        year: labels.year,
      });
      return {
        ...sampled,
        kind: variant.id ? `${template.id}/${variant.id}` : template.id,
        difficulty: labels.difficulty,
        year: labels.year,
      };
    },
  };
}
