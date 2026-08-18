import { evaluateTemplateExpr, numberToTex } from "../cas";
import {
  aligned,
  linear,
  monomial,
  signed,
  texFrac,
} from "../algorithms/algebra/helpers";
import { nonzero, pick, randInt } from "../algorithms/rng";
import { problem } from "../algorithms/types";
import type {
  AlgorithmContext,
  GeneratedProblem,
  ProblemAlgorithm,
} from "../algorithms/types";
import type { GeneratorDifficulty } from "../types";
import { parseProblemTemplateOrThrow } from "./adapt";
import { inferTemplateFormula } from "./check";
import type {
  LeafParamSpec,
  ParamSpec,
  ProblemTemplate,
  TemplateVariant,
} from "./schema";

const SAMPLE_RETRIES = 48;
const INT_RETRIES = 64;
/** Innermost `{{...}}` only — so LaTeX `x^{{{p}}}` becomes `x^{2}`, not slot `{p`. */
const SLOT = /\{\{\s*([^{}]+?)\s*\}\}/g;
const INT_LITERAL = /^-?\d+$/;
const FORMATTERS = new Set([
  "linear",
  "signed",
  "texFrac",
  "abs",
  "lead",
  "term",
]);

type SlotValue = number | string;

function isIntParam(
  spec: LeafParamSpec,
): spec is Extract<LeafParamSpec, { int: [number, number] }> {
  return "int" in spec;
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
  throw new Error("int sample exhausted");
}

function leafForDifficulty(
  spec: ParamSpec,
  difficulty: GeneratorDifficulty,
): LeafParamSpec {
  if (!("byDifficulty" in spec)) return spec;
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

function exampleFits(
  spec: ParamSpec,
  value: SlotValue,
  difficulty: GeneratorDifficulty,
): boolean {
  const leaf = leafForDifficulty(spec, difficulty);
  if (isIntParam(leaf)) {
    if (typeof value !== "number" || !Number.isInteger(value)) return false;
    const [min, max] = leaf.int;
    if (value < min || value > max) return false;
    if (leaf.nonzero && value === 0) return false;
    if (leaf.exclude?.includes(value)) return false;
    return true;
  }
  return leaf.pick.some((item) => item === value);
}

function sampleParams(
  variant: TemplateVariant,
  ctx: AlgorithmContext,
  useExample: boolean,
): Record<string, SlotValue> {
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
    if (typeof value === "number") scope[name] = value;
  }
  return scope;
}

function applyDerived(
  variant: TemplateVariant,
  values: Record<string, SlotValue>,
): boolean {
  for (const [name, expr] of Object.entries(variant.derived)) {
    const result = evaluateTemplateExpr(expr, numericScope(values));
    if (!result.ok) {
      if (result.reason === "sym") continue;
      if (result.reason === "unclean" || result.reason === "nonreal") {
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
      if (result.reason === "unclean" || result.reason === "nonreal") {
        return false;
      }
      throw new Error(`constraint ${expr}: ${result.reason}`);
    }
    if (result.value === 0) return false;
  }
  return true;
}

function resolveArg(
  token: string,
  values: Record<string, SlotValue>,
  asLiteral = false,
): SlotValue {
  if (token in values) return values[token]!;
  if (INT_LITERAL.test(token)) return Number(token);
  if (asLiteral) return token;
  throw new Error(`unknown slot ${token}`);
}

function asNumber(value: SlotValue, label: string): number {
  if (typeof value !== "number") {
    throw new Error(`${label} is not a number`);
  }
  return value;
}

function asLetter(value: SlotValue): string {
  return typeof value === "string" ? value : String(value);
}

function formatValue(value: SlotValue): string {
  if (typeof value === "string") return value;
  return numberToTex(value);
}

function formatPolyTerm(coef: number, body: string, leading: boolean) {
  if (coef === 0) return "";
  const piece = monomial(coef, body);
  if (leading) return coef < 0 ? `-${piece}` : piece;
  return coef < 0 ? `- ${piece}` : `+ ${piece}`;
}

function termBody(args: SlotValue[]) {
  return args
    .slice(1)
    .map((value) => (typeof value === "string" ? value : formatValue(value)))
    .join("");
}

function applyFormatter(
  name: string,
  args: SlotValue[],
): string {
  switch (name) {
    case "linear": {
      if (args.length !== 3) throw new Error("linear needs a b v");
      return linear(
        asNumber(args[0]!, "linear a"),
        asNumber(args[1]!, "linear b"),
        asLetter(args[2]!),
      );
    }
    case "signed": {
      if (args.length !== 1) throw new Error("signed needs n");
      return signed(asNumber(args[0]!, "signed n"));
    }
    case "texFrac": {
      if (args.length !== 2) throw new Error("texFrac needs n d");
      return texFrac(
        asNumber(args[0]!, "texFrac n"),
        asNumber(args[1]!, "texFrac d"),
      );
    }
    case "abs": {
      if (args.length !== 1) throw new Error("abs needs n");
      return `\\left|${formatValue(args[0]!)}\\right|`;
    }
    case "lead": {
      if (args.length < 1) throw new Error("lead needs coef");
      return formatPolyTerm(asNumber(args[0]!, "lead coef"), termBody(args), true);
    }
    case "term": {
      if (args.length < 1) throw new Error("term needs coef");
      return formatPolyTerm(asNumber(args[0]!, "term coef"), termBody(args), false);
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
const BROKEN_EXPR_SLOT =
  /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,23})\s*\}(?!\})(\s*[+\-*/^]\s*[^}]*?)\}\}/g;

function rewriteBrokenSlots(
  template: string,
  values: Record<string, SlotValue>,
): string {
  return template.replace(
    BROKEN_EXPR_SLOT,
    (full, name: string, rest: string, offset: number) => {
      if (!(name in values)) return full;
      const wrapped = offset > 0 && template[offset - 1] === "{";
      const alreadyClosed = template[offset + full.length] === "}";
      const closer = wrapped && !alreadyClosed ? "}" : "";
      return `{{${name}${rest}}}${closer}`;
    },
  );
}

function render(template: string, values: Record<string, SlotValue>): string {
  return rewriteBrokenSlots(template, values).replace(SLOT, (_, inner: string) => {
    const trimmed = inner.trim();
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) throw new Error("empty slot");

    const head = tokens[0]!;
    if (tokens.length > 1 && FORMATTERS.has(head)) {
      const argTokens = tokens.slice(1);
      const literalArgs = head === "term" || head === "lead";
      return applyFormatter(
        head,
        argTokens.map((token, index) =>
          resolveArg(token, values, literalArgs && index > 0),
        ),
      );
    }

    if (tokens.length === 1 && (head in values || INT_LITERAL.test(head))) {
      return formatValue(resolveArg(head, values));
    }

    return renderExprSlot(trimmed, values);
  });
}

function instantiateVariant(
  template: ProblemTemplate,
  variant: TemplateVariant,
  ctx: AlgorithmContext,
): GeneratedProblem {
  const label = variant.id
    ? `${template.id}/${variant.id}`
    : template.id;

  for (let attempt = 0; attempt < SAMPLE_RETRIES; attempt += 1) {
    const values = sampleParams(
      variant,
      ctx,
      Boolean(ctx.anchorExample) && attempt === 0,
    );
    if (!applyDerived(variant, values)) continue;
    if (!constraintsHold(variant, values)) continue;

    const promptTex = render(variant.prompt, values);
    const solutionTex = variant.solutionSteps
      ? aligned(variant.solutionSteps.map((step) => render(step, values)))
      : render(variant.solution ?? "", values);

    const formula = inferTemplateFormula(variant);
    return problem({
      instructionId: template.instructionId,
      promptTex,
      solutionTex,
      promptTemplate: variant.prompt,
      formula: formula ?? "",
      variables: numericScope(values),
    });
  }

  throw new Error(`template ${label}: sampling failed after ${SAMPLE_RETRIES} retries`);
}

export function compileTemplate(raw: unknown): ProblemAlgorithm {
  const template = parseProblemTemplateOrThrow(raw);
  return {
    id: template.id,
    topic: template.topic,
    difficulties: template.difficulties,
    years: template.years,
    generate(ctx) {
      const variant = pick(ctx.rng, template.variants);
      return instantiateVariant(template, variant, ctx);
    },
  };
}
