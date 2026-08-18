import { parse } from "mathjs";
import { numberToTex, verifyFormula } from "./cas";
import type { ProblemInstructionId } from "./types";

const FRESH_NAMES = [
  "s",
  "u",
  "v",
  "w",
  "h",
  "q",
  "r",
  "d",
  "f",
  "g",
  "j",
  "o",
] as const;

const EXPONENT_NAMES = /^(n|k|p|m)$/;
const POINT_NAMES = /^(x|y|z|t|a|b|c)$/;

const FN_PAIRS: [string, string][] = [
  ["sind", "cosd"],
  ["sin", "cos"],
  ["tand", "cotd"],
  ["tan", "cot"],
  ["sinh", "cosh"],
  ["log10", "log2"],
  ["log", "log10"],
  ["sqrt", "cbrt"],
  ["gcd", "lcm"],
  ["min", "max"],
  ["nCr", "nPr"],
  ["combinations", "permutations"],
  ["square", "cube"],
  ["floor", "ceil"],
  ["secd", "cscd"],
];

const TEX_PAIRS: [string, string][] = [
  ["\\sin", "\\cos"],
  ["\\tan", "\\cot"],
  ["\\sinh", "\\cosh"],
  ["\\log_{10}", "\\log_{2}"],
  ["\\sqrt", "\\sqrt[3]"],
  ["\\gcd", "\\operatorname{lcm}"],
  ["\\min", "\\max"],
  ["\\lfloor", "\\lceil"],
  ["\\sec", "\\csc"],
];

export type VaryLimits = {
  absMax: number;
  absMin: number;
  negChance: number;
  expMax: number;
  scaleMax: number;
  shiftMax: number;
  mutateCount: number;
  allowFlip: boolean;
  allowBumpPow: boolean;
  allowSwapFn: boolean;
  allowSwapOp: boolean;
};

export type MutableProblem = {
  formula: string;
  variables: Record<string, number>;
  promptTex: string;
  promptTemplate?: string;
  instructionId: ProblemInstructionId;
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function rollVaryLimits(rng: () => number): VaryLimits {
  return {
    absMin: 1,
    absMax: randInt(rng, 10, 20),
    negChance: 0.22 + rng() * 0.38,
    expMax: randInt(rng, 3, 6),
    scaleMax: randInt(rng, 2, 7),
    shiftMax: randInt(rng, 2, 9),
    mutateCount: randInt(rng, 1, 2),
    allowFlip: rng() < 0.7,
    allowBumpPow: rng() < 0.75,
    allowSwapFn: rng() < 0.7,
    allowSwapOp: rng() < 0.45,
  };
}

export function freshVarName(used: Record<string, number>): string | null {
  const taken = new Set(Object.keys(used));
  for (const name of FRESH_NAMES) {
    if (!taken.has(name)) return name;
  }
  return null;
}

function isExponentVar(name: string, value: number) {
  if (EXPONENT_NAMES.test(name)) return true;
  if (POINT_NAMES.test(name)) return false;
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function randomizeValue(
  rng: () => number,
  name: string,
  original: number,
  limits: VaryLimits,
) {
  if (isExponentVar(name, original)) {
    let next = randInt(rng, 1, limits.expMax);
    if (next === original) next = next >= limits.expMax ? next - 1 : next + 1;
    return Math.max(1, next);
  }

  for (let attempt = 0; attempt < 32; attempt += 1) {
    let next = randInt(rng, limits.absMin, limits.absMax);
    if (rng() < limits.negChance || original < 0) next = -next;
    if (next !== original) return next;
  }

  return original === 0 ? 1 : -original;
}

export function randomizeVariables(
  variables: Record<string, number>,
  limits: VaryLimits,
  rng: () => number,
) {
  const next: Record<string, number> = {};
  for (const [name, value] of Object.entries(variables)) {
    next[name] = randomizeValue(rng, name, value, limits);
  }
  return next;
}

function stripOuterScaleTex(tex: string) {
  const match = tex.trim().match(
    /^(?:[^{}\\]|\\cdot|\\left|\\right|\s)*\\cdot\s*\\left\(([\s\S]*)\\right\)$/,
  );
  return match?.[1] ?? tex;
}

function stripOuterAbsTex(tex: string) {
  const match = tex.trim().match(/^\\left\|([\s\S]*)\\right\|$/);
  return match?.[1] ?? tex;
}

function stripOuterShiftTex(tex: string) {
  const match = tex
    .trim()
    .match(/^\\left\(([\s\S]*)\\right\)\s*[+-]\s*(?:\{\-?[0-9./\\]+\}|[0-9]+|\{\{[^}]+\}\})$/);
  return match?.[1] ?? tex;
}

function dropVar(
  variables: Record<string, number>,
  name: string,
): Record<string, number> {
  const next = { ...variables };
  delete next[name];
  return next;
}

/** Peel nested s*(…), (…)+t, and abs(…) so variants cannot grow forever. */
export function unwrapOuter(problem: MutableProblem): MutableProblem {
  let current = problem;
  for (let i = 0; i < 8; i += 1) {
    const formula = current.formula.trim();
    const scale = formula.match(/^([A-Za-z][A-Za-z0-9_]*)\*\(([\s\S]*)\)$/);
    if (scale && scale[1] in current.variables) {
      current = {
        ...current,
        formula: scale[2],
        variables: dropVar(current.variables, scale[1]),
        promptTex: stripOuterScaleTex(current.promptTex),
        promptTemplate: current.promptTemplate
          ? stripOuterScaleTex(current.promptTemplate)
          : current.promptTemplate,
      };
      continue;
    }

    const shift = formula.match(/^\(([\s\S]*)\)\+([A-Za-z][A-Za-z0-9_]*)$/);
    if (shift && shift[2] in current.variables) {
      current = {
        ...current,
        formula: shift[1],
        variables: dropVar(current.variables, shift[2]),
        promptTex: stripOuterShiftTex(current.promptTex),
        promptTemplate: current.promptTemplate
          ? stripOuterShiftTex(current.promptTemplate)
          : current.promptTemplate,
      };
      continue;
    }

    const abs = formula.match(/^abs\(([\s\S]*)\)$/);
    if (abs) {
      current = {
        ...current,
        formula: abs[1],
        promptTex: stripOuterAbsTex(current.promptTex),
        promptTemplate: current.promptTemplate
          ? stripOuterAbsTex(current.promptTemplate)
          : current.promptTemplate,
      };
      continue;
    }

    const neg = formula.match(/^-\(([\s\S]*)\)$/);
    if (neg) {
      current = {
        ...current,
        formula: neg[1],
        promptTex: current.promptTex.replace(/^-\\left\(([\s\S]*)\\right\)$/, "$1"),
        promptTemplate: current.promptTemplate?.replace(
          /^-\\left\(([\s\S]*)\\right\)$/,
          "$1",
        ),
      };
      continue;
    }

    const rec = formula.match(/^1\/\(([\s\S]*)\)$/);
    if (rec) {
      current = {
        ...current,
        formula: rec[1],
        promptTex: current.promptTex.replace(
          /^\\dfrac\{1\}\{\\left\(([\s\S]*)\\right\)\}$/,
          "$1",
        ),
        promptTemplate: current.promptTemplate?.replace(
          /^\\dfrac\{1\}\{\\left\(([\s\S]*)\\right\)\}$/,
          "$1",
        ),
      };
      continue;
    }

    break;
  }
  return current;
}

function wrapScale(problem: MutableProblem, name: string, value: number): MutableProblem {
  const slot = `{{${name}}}`;
  const inner = problem.promptTemplate ?? problem.promptTex;
  return {
    ...problem,
    formula: `${name}*(${problem.formula})`,
    variables: { ...problem.variables, [name]: value },
    promptTex: `${numberToTex(value)} \\cdot \\left(${problem.promptTex}\\right)`,
    promptTemplate: `${slot} \\cdot \\left(${inner}\\right)`,
  };
}

function wrapShift(problem: MutableProblem, name: string, value: number): MutableProblem {
  const slot = `{{${name}}}`;
  const inner = problem.promptTemplate ?? problem.promptTex;
  const op = value < 0 ? "-" : "+";
  const absTex = numberToTex(Math.abs(value));
  return {
    ...problem,
    formula: `(${problem.formula})+${name}`,
    variables: { ...problem.variables, [name]: value },
    promptTex: `\\left(${problem.promptTex}\\right) ${op} ${absTex}`,
    promptTemplate: `\\left(${inner}\\right) + ${slot}`,
  };
}

function wrapNegate(problem: MutableProblem): MutableProblem {
  const inner = problem.promptTemplate ?? problem.promptTex;
  return {
    ...problem,
    formula: `-(${problem.formula})`,
    promptTex: `-\\left(${problem.promptTex}\\right)`,
    promptTemplate: `-\\left(${inner}\\right)`,
  };
}

function wrapReciprocal(problem: MutableProblem): MutableProblem {
  const inner = problem.promptTemplate ?? problem.promptTex;
  return {
    ...problem,
    formula: `1/(${problem.formula})`,
    promptTex: `\\dfrac{1}{\\left(${problem.promptTex}\\right)}`,
    promptTemplate: `\\dfrac{1}{\\left(${inner}\\right)}`,
  };
}

function wrapAbs(problem: MutableProblem): MutableProblem {
  const inner = problem.promptTemplate ?? problem.promptTex;
  return {
    ...problem,
    formula: `abs(${problem.formula})`,
    promptTex: `\\left|${problem.promptTex}\\right|`,
    promptTemplate: `\\left|${inner}\\right|`,
  };
}

function canScale(instructionId: ProblemInstructionId) {
  return instructionId !== "solve";
}

function canShiftOrAbs(instructionId: ProblemInstructionId) {
  return instructionId === "evaluate";
}

function canFlip(instructionId: ProblemInstructionId) {
  return (
    instructionId === "evaluate" ||
    instructionId === "expand" ||
    instructionId === "missingSide"
  );
}

function replaceOnce(haystack: string, from: string, to: string) {
  const idx = haystack.indexOf(from);
  if (idx < 0) return haystack;
  return haystack.slice(0, idx) + to + haystack.slice(idx + from.length);
}

function firstBinaryMinus(expr: string) {
  for (let i = 1; i < expr.length; i += 1) {
    if (expr[i] !== "-") continue;
    const prev = expr[i - 1];
    if (prev && /[\w)]/.test(prev)) return i;
  }
  return -1;
}

function flipAddSub(problem: MutableProblem): MutableProblem | null {
  const plus = problem.formula.indexOf("+");
  const minus = firstBinaryMinus(problem.formula);
  if (plus < 0 && minus < 0) return null;

  let formula = problem.formula;
  let promptTex = problem.promptTex;
  let promptTemplate = problem.promptTemplate;
  if (plus >= 0 && (minus < 0 || plus <= minus)) {
    formula = replaceOnce(formula, "+", "-");
    promptTex = replaceOnce(promptTex, "+", "-");
    if (promptTemplate) promptTemplate = replaceOnce(promptTemplate, "+", "-");
  } else {
    formula = formula.slice(0, minus) + "+" + formula.slice(minus + 1);
    const pMinus = firstBinaryMinus(promptTex);
    if (pMinus >= 0) {
      promptTex = promptTex.slice(0, pMinus) + "+" + promptTex.slice(pMinus + 1);
    }
    const tMinus = promptTemplate ? firstBinaryMinus(promptTemplate) : -1;
    if (promptTemplate && tMinus >= 0) {
      promptTemplate =
        promptTemplate.slice(0, tMinus) + "+" + promptTemplate.slice(tMinus + 1);
    }
  }
  if (formula === problem.formula) return null;
  return { ...problem, formula, promptTex, promptTemplate };
}

function bumpInteger(tex: string, from: number, to: number) {
  const froms = [`^{${from}}`, `^${from}`, `{${from}}`];
  const tos = [`^{${to}}`, `^${to}`, `{${to}}`];
  let next = tex;
  for (let i = 0; i < froms.length; i += 1) {
    if (next.includes(froms[i])) {
      next = replaceOnce(next, froms[i], tos[i]);
      return next;
    }
  }
  return next;
}

function bumpPowers(
  problem: MutableProblem,
  limits: VaryLimits,
  rng: () => number,
): MutableProblem | null {
  try {
    const node = parse(problem.formula).clone();
    const found: { from: number; to: number }[] = [];
    node.traverse((child) => {
      if (found.length > 0) return;
      const op = child as {
        type: string;
        op?: string;
        fn?: { name?: string };
        args?: { type: string; value?: unknown }[];
      };
      const expNode =
        op.type === "OperatorNode" && op.op === "^"
          ? op.args?.[1]
          : op.type === "FunctionNode" && op.fn?.name === "pow"
            ? op.args?.[1]
            : undefined;
      if (expNode?.type !== "ConstantNode") return;
      const from = Number(expNode.value);
      if (!Number.isInteger(from) || from < 2 || from > 6) return;
      let to = from + (rng() < 0.5 ? -1 : 1);
      to = Math.min(limits.expMax, Math.max(2, to));
      if (to === from) to = from === 2 ? 3 : from - 1;
      expNode.value = to;
      found.push({ from, to });
    });
    if (found.length === 0) return null;
    const { from, to } = found[0];
    return {
      ...problem,
      formula: node.toString(),
      promptTex: bumpInteger(problem.promptTex, from, to),
      promptTemplate: problem.promptTemplate
        ? bumpInteger(problem.promptTemplate, from, to)
        : problem.promptTemplate,
    };
  } catch {
    return null;
  }
}

function swapFunctions(problem: MutableProblem, rng: () => number): MutableProblem | null {
  const hits = FN_PAIRS.filter(
    ([a, b]) =>
      new RegExp(`\\b${a}\\b`).test(problem.formula) ||
      new RegExp(`\\b${b}\\b`).test(problem.formula),
  );
  if (hits.length === 0) return null;
  const pair = hits[randInt(rng, 0, hits.length - 1)];
  if (!pair) return null;
  const [a, b] = pair;
  const useA = new RegExp(`\\b${a}\\b`).test(problem.formula);
  const from = useA ? a : b;
  const to = useA ? b : a;
  const formula = problem.formula.replace(new RegExp(`\\b${from}\\b`), to);

  let promptTex = problem.promptTex;
  let promptTemplate = problem.promptTemplate;
  const texPair = TEX_PAIRS.find(
    ([left, right]) => promptTex.includes(left) || promptTex.includes(right),
  );
  if (texPair) {
    const [left, right] = texPair;
    if (promptTex.includes(left)) {
      promptTex = replaceOnce(promptTex, left, right);
      if (promptTemplate) {
        promptTemplate = replaceOnce(promptTemplate, left, right);
      }
    } else {
      promptTex = replaceOnce(promptTex, right, left);
      if (promptTemplate) {
        promptTemplate = replaceOnce(promptTemplate, right, left);
      }
    }
  }

  if (formula === problem.formula) return null;
  return { ...problem, formula, promptTex, promptTemplate };
}

function swapMulDiv(problem: MutableProblem): MutableProblem | null {
  const star = problem.formula.indexOf("*");
  const slash = problem.formula.indexOf("/");
  if (star < 0 && slash < 0) return null;

  let formula = problem.formula;
  let promptTex = problem.promptTex;
  let promptTemplate = problem.promptTemplate;
  if (slash >= 0 && (star < 0 || slash < star)) {
    formula = replaceOnce(formula, "/", "*");
    promptTex = promptTex.includes("\\frac")
      ? promptTex
      : replaceOnce(replaceOnce(promptTex, "/", "\\cdot "), "\\div", "\\cdot ");
    if (promptTemplate && !promptTemplate.includes("\\frac")) {
      promptTemplate = replaceOnce(promptTemplate, "/", "\\cdot ");
    }
  } else {
    formula = replaceOnce(formula, "*", "/");
    promptTex = replaceOnce(promptTex, "\\cdot ", "/");
    if (promptTemplate) {
      promptTemplate = replaceOnce(promptTemplate, "\\cdot ", "/");
    }
  }
  if (formula === problem.formula) return null;
  return { ...problem, formula, promptTex, promptTemplate };
}

export type VariantRecipe =
  | "scale"
  | "shift"
  | "negate"
  | "reciprocal"
  | "abs"
  | "flip"
  | "pow"
  | "fn"
  | "op"
  | "numbers";

export function recipesFor(
  instructionId: ProblemInstructionId,
): VariantRecipe[] {
  if (instructionId === "findDerivative") {
    return ["scale", "negate", "numbers", "pow", "fn"];
  }
  if (instructionId === "percentOf") {
    return ["scale", "numbers", "flip", "negate"];
  }
  if (instructionId === "solve") {
    return ["numbers", "flip", "pow", "negate"];
  }
  if (instructionId === "missingSide") {
    return ["scale", "numbers", "flip", "pow"];
  }
  return [
    "scale",
    "shift",
    "negate",
    "reciprocal",
    "abs",
    "flip",
    "pow",
    "fn",
    "op",
    "numbers",
  ];
}

export function applyRecipe(
  core: MutableProblem,
  recipe: VariantRecipe,
  limits: VaryLimits,
  rng: () => number,
): MutableProblem | null {
  const base: MutableProblem = {
    ...core,
    variables: randomizeVariables(core.variables, limits, rng),
  };

  switch (recipe) {
    case "numbers":
      return base;
    case "scale": {
      if (!canScale(base.instructionId)) return null;
      const name = freshVarName(base.variables);
      if (!name) return null;
      return wrapScale(base, name, randInt(rng, 2, limits.scaleMax));
    }
    case "shift": {
      if (!canShiftOrAbs(base.instructionId)) return null;
      const name = freshVarName(base.variables);
      if (!name) return null;
      let value = randInt(rng, 1, limits.shiftMax);
      if (rng() < 0.45) value = -value;
      return wrapShift(base, name, value);
    }
    case "negate":
      return wrapNegate(base);
    case "reciprocal":
      return canShiftOrAbs(base.instructionId) ? wrapReciprocal(base) : null;
    case "abs":
      return canShiftOrAbs(base.instructionId) ? wrapAbs(base) : null;
    case "flip":
      return canFlip(base.instructionId) ? flipAddSub(base) : null;
    case "pow":
      return bumpPowers(base, limits, rng);
    case "fn":
      return swapFunctions(base, rng);
    case "op":
      return base.instructionId === "evaluate" ? swapMulDiv(base) : null;
    default:
      return null;
  }
}

export function shapeKey(formula: string) {
  return formula.replace(/-?\d+(?:\.\d+)?/g, "n").replace(/\s+/g, "");
}

/** Add coefficient / shift slots so later variants can move more than one number. */
export function ensureVariableSlots(
  problem: MutableProblem,
  rng: () => number,
  target = 3,
): MutableProblem {
  if (Object.keys(problem.variables).length >= target) return problem;

  const name = freshVarName(problem.variables);
  if (!name) return problem;

  const next =
    canShiftOrAbs(problem.instructionId) && rng() < 0.45
      ? wrapShift(problem, name, randInt(rng, 2, 6))
      : canScale(problem.instructionId)
        ? wrapScale(problem, name, randInt(rng, 2, 5))
        : null;
  if (!next) return problem;

  const cas = verifyFormula(
    next.formula,
    Object.entries(next.variables).map(([n, value]) => ({ name: n, value })),
  );
  return cas.ok ? next : problem;
}

export function fingerprint(formula: string, variables: Record<string, number>) {
  const vars = Object.keys(variables)
    .sort()
    .map((name) => `${name}:${variables[name]}`)
    .join("|");
  return `${formula}#${vars}`;
}
