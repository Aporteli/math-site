import { combinations, parse, permutations, type MathNode } from "mathjs";
import { CAS_SCHOOL_FUNCTIONS, CAS_SCHOOL_SCOPE } from "./cas-school";
import { formatNumber } from "./tex";
import type { ProblemDifficulty } from "./types";

const ALLOWED_EXPR = /^[0-9A-Za-z_+\-*/^()!%.,\s]+$/;
const BLOCKED =
  /\b(constructor|prototype|window|document|Function|eval|globalThis|import|createUnit|random)\b/i;
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;

const FORMULA_MAX = 320;
const VARIABLE_ABS_MAX = 200;

/** Built-in math.js names that return a single finite real for scalar args. */
export const CAS_FUNCTIONS = [
  "abs",
  "sign",
  "fix",
  "round",
  "floor",
  "ceil",
  "sqrt",
  "cbrt",
  "nthRoot",
  "square",
  "cube",
  "pow",
  "exp",
  "expm1",
  "log",
  "log2",
  "log10",
  "log1p",
  "hypot",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "sec",
  "csc",
  "cot",
  "asec",
  "acsc",
  "acot",
  "sinh",
  "cosh",
  "tanh",
  "asinh",
  "acosh",
  "atanh",
  "sech",
  "csch",
  "coth",
  "gcd",
  "lcm",
  "mod",
  "factorial",
  "gamma",
  "combinations",
  "combinationsWithRep",
  "permutations",
  "catalan",
  "bellNumbers",
  "stirlingS2",
  "composition",
  "min",
  "max",
  "sum",
  "prod",
  "mean",
  "median",
  "mad",
  "std",
  "variance",
  "erf",
  "acoth",
  "acsch",
  "asech",
  "bernoulli",
  "invmod",
  "lgamma",
  "zeta",
  "add",
  "subtract",
  "multiply",
  "divide",
  "unaryMinus",
  "unaryPlus",
  "addScalar",
  "subtractScalar",
  "multiplyScalar",
  "divideScalar",
  "bitAnd",
  "bitNot",
  "bitOr",
  "bitXor",
  "leftShift",
  "rightArithShift",
  "rightLogShift",
  "compare",
  "conj",
  "re",
  "im",
  "arg",
] as const;

/** Injected helpers: school degree-trig and nCr / nPr aliases. */
export const CAS_EXTRA_FUNCTIONS = [
  "sind",
  "cosd",
  "tand",
  "asind",
  "acosd",
  "atand",
  "nCr",
  "nPr",
] as const;

export const CAS_CONSTANTS = ["pi", "e", "tau", "phi"] as const;

const ALLOWED_FUNCTIONS = new Set<string>([
  ...CAS_FUNCTIONS,
  ...CAS_EXTRA_FUNCTIONS,
  ...CAS_SCHOOL_FUNCTIONS,
  "ln",
  "lg",
  "lb",
]);

const CONSTANT_SET = new Set<string>(CAS_CONSTANTS);

const RESERVED = new Set([
  "i",
  ...CAS_CONSTANTS,
  ...ALLOWED_FUNCTIONS,
]);

const UNSAFE_NODES = new Set([
  "AssignmentNode",
  "FunctionAssignmentNode",
  "BlockNode",
  "RangeNode",
  "IndexNode",
  "AccessorNode",
  "ObjectNode",
  "ArrayNode",
  "ConditionalNode",
]);

function toDeg(radians: number) {
  return (radians * 180) / Math.PI;
}

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error("nonreal");
  return n;
}

const CAS_SCOPE: Record<string, number | ((...args: unknown[]) => number)> = {
  pi: Math.PI,
  e: Math.E,
  tau: 2 * Math.PI,
  phi: (1 + Math.sqrt(5)) / 2,
  sind: (x) => Math.sin(toRad(num(x))),
  cosd: (x) => Math.cos(toRad(num(x))),
  tand: (x) => Math.tan(toRad(num(x))),
  asind: (x) => toDeg(Math.asin(num(x))),
  acosd: (x) => toDeg(Math.acos(num(x))),
  atand: (x) => toDeg(Math.atan(num(x))),
  nCr: (n, k) => num(combinations(num(n), num(k))),
  nPr: (n, k) => num(permutations(num(n), num(k))),
  ...CAS_SCHOOL_SCOPE,
};

export type CasOk = {
  ok: true;
  value: number;
  solutionTex: string;
};

export type CasFail = { ok: false; reason: string };

/**
 * Evaluate a sanitized math.js expression against a numeric scope.
 * Used by the JSON template engine for derived fields and constraints.
 */
export function evaluateCas(
  rawFormula: string,
  scope: Record<string, number>,
): { ok: true; value: number } | CasFail {
  try {
    const formula = sanitizeFormula(rawFormula);
    const filtered = scopeForFormula(formula, scope);
    const names = Object.keys(filtered);
    const variables =
      names.length === 0
        ? {}
        : sanitizeVariables(
            names.map((name) => ({ name, value: filtered[name]! })),
            { allowReserved: true },
          );
    const node = parse(formula);
    assertSafeAst(node, new Set(Object.keys(variables)));

    const compiled = node.compile();
    const raw = compiled.evaluate({
      ...CAS_SCOPE,
      ...variables,
    });

    if (typeof raw === "boolean") {
      return { ok: true, value: raw ? 1 : 0 };
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return { ok: false, reason: "nonreal" };
    }

    const value = snapClean(raw);
    if (value === null) return { ok: false, reason: "unclean" };
    return { ok: true, value };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unsafe";
    return { ok: false, reason };
  }
}

const COMPARE_OPS = ["<=", ">=", "!=", "==", "<", ">"] as const;
type CompareOp = (typeof COMPARE_OPS)[number];

const OR_SEPS = ["||", " or ", " ∨ ", "∨"] as const;
const AND_SEPS = ["&&", " and ", " ∧ ", "∧"] as const;
const COMPARE_EPS = 1e-9;

function rewriteCompareMacros(expr: string) {
  return expr
    .replace(/\\(?:geq|ge)(?![A-Za-z])/gi, ">=")
    .replace(/\\(?:leq|le)(?![A-Za-z])/gi, "<=")
    .replace(/\\(?:neq|ne)(?![A-Za-z])/gi, "!=")
    .replace(/\\gt(?![A-Za-z])/gi, ">")
    .replace(/\\lt(?![A-Za-z])/gi, "<")
    .replace(/<>/g, "!=")
    .replace(/≠/g, "!=")
    .replace(/≥|⩾/g, ">=")
    .replace(/≤|⩽/g, "<=");
}

function rewriteBareEquals(expr: string) {
  return expr.replace(/(?<![<>!=])=(?![=])/g, "==");
}

function splitTopLevel(expr: string, seps: readonly string[]): string[] {
  const sorted = [...seps].sort((a, b) => b.length - a.length);
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < expr.length; i += 1) {
    const char = expr[i]!;
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      const hit = sorted.find(
        (sep) => expr.slice(i, i + sep.length).toLowerCase() === sep.toLowerCase(),
      );
      if (hit) {
        parts.push(expr.slice(start, i).trim());
        i += hit.length - 1;
        start = i + 1;
      }
    }
  }
  parts.push(expr.slice(start).trim());
  return parts;
}

function compareOp(op: CompareOp, left: number, right: number) {
  switch (op) {
    case "==":
      return Math.abs(left - right) < COMPARE_EPS;
    case "!=":
      return Math.abs(left - right) >= COMPARE_EPS;
    case ">":
      return left > right + COMPARE_EPS;
    case "<":
      return left < right - COMPARE_EPS;
    case ">=":
      return left > right - COMPARE_EPS;
    case "<=":
      return left < right + COMPARE_EPS;
  }
}

function evalCompareChain(
  expr: string,
  scope: Record<string, number>,
): { ok: true; value: number } | CasFail {
  const parts: Array<
    { kind: "expr"; value: string } | { kind: "op"; value: CompareOp }
  > = [];
  let depth = 0;
  let buf = "";
  let i = 0;
  while (i < expr.length) {
    const char = expr[i]!;
    if (char === "(") {
      depth += 1;
      buf += char;
      i += 1;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      buf += char;
      i += 1;
      continue;
    }
    if (depth === 0) {
      const rest = expr.slice(i);
      const op = COMPARE_OPS.find((candidate) => rest.startsWith(candidate));
      if (op) {
        parts.push({ kind: "expr", value: buf.trim() });
        parts.push({ kind: "op", value: op });
        buf = "";
        i += op.length;
        continue;
      }
    }
    buf += char;
    i += 1;
  }
  if (buf.trim()) parts.push({ kind: "expr", value: buf.trim() });

  const exprs = parts.filter(
    (part): part is { kind: "expr"; value: string } => part.kind === "expr",
  );
  const ops = parts.filter(
    (part): part is { kind: "op"; value: CompareOp } => part.kind === "op",
  );
  if (ops.length === 0) return evaluateCas(expr, scope);
  if (exprs.length !== ops.length + 1 || exprs.some((part) => !part.value)) {
    return { ok: false, reason: "unsafe" };
  }

  const values: number[] = [];
  for (const part of exprs) {
    const result = evaluateCas(part.value, scope);
    if (!result.ok) return result;
    values.push(result.value);
  }
  for (let index = 0; index < ops.length; index += 1) {
    if (!compareOp(ops[index]!.value, values[index]!, values[index + 1]!)) {
      return { ok: true, value: 0 };
    }
  }
  return { ok: true, value: 1 };
}

function evalAndExpr(
  expr: string,
  scope: Record<string, number>,
): { ok: true; value: number } | CasFail {
  const parts = splitTopLevel(expr, AND_SEPS);
  if (parts.length <= 1) return evalCompareChain(expr, scope);
  for (const part of parts) {
    if (!part) return { ok: false, reason: "unsafe" };
    const result = evalCompareChain(part, scope);
    if (!result.ok) return result;
    if (result.value === 0) return { ok: true, value: 0 };
  }
  return { ok: true, value: 1 };
}

/**
 * Template-engine evaluator: comparisons, and/or, then the same CAS as evaluateCas.
 * Formula verification stays on evaluateCas / verifyFormula and still rejects `=`, `>`.
 */
export function evaluateTemplateExpr(
  rawFormula: string,
  scope: Record<string, number>,
): { ok: true; value: number } | CasFail {
  const expr = rewriteBareEquals(rewriteCompareMacros(rawFormula.trim()));
  if (!expr) return { ok: false, reason: "empty" };

  const orParts = splitTopLevel(expr, OR_SEPS);
  if (orParts.length <= 1) return evalAndExpr(expr, scope);

  for (const part of orParts) {
    if (!part) return { ok: false, reason: "unsafe" };
    const result = evalAndExpr(part, scope);
    if (!result.ok) return result;
    if (result.value !== 0) return { ok: true, value: 1 };
  }
  return { ok: true, value: 0 };
}

/** Prompt fragment so Gemini stays inside what verifyFormula can check. */
export function casVerifiedPromptGuide(difficulty?: ProblemDifficulty) {
  return [
    "promptTex is a complete school exercise a student would sit — not a textbook identity.",
    "Write a short stem in the teacher's language, with NORMAL spaces between words.",
    "Put ONLY formulae inside $...$ (inline) or $$...$$ (display). Never glue words together.",
    "Every coefficient, length, and evaluation point in promptTex must be a CONCRETE integer already substituted.",
    "Write signed terms normally: $5x^{2}-7x+2=0$, never $5x^{2}+{-7}x+2$ or $3x^2+-12x$.",
    "Never write the general form ax^2+bx+c as the problem. Always pick integers.",
    "promptTemplate is promptTex with each of those numbers replaced by {{name}} matching variables.",
    "formula must be a math.js expression using the variable names that evaluates to ONE finite real (the answer).",
    "Use at least 3 named variables. Every coefficient, exponent, addend, and evaluation point must be a variable.",
    "Do not bake digits such as 2 or 3 into formula — write pow(x,n)/(x+a) with variables n, a, x, not pow(x,2)/(x+1) with only x. 0 and 1 are allowed if structurally required.",
    "The computed value must snap to an integer or a simple fraction (denominator at most 24). Prefer sind(30) or sin(pi/6) over sin(1).",
    "Do not put the answer in promptTex or formula. Do not wrap an extra scale or +2 onto the statement.",
    ...casDifficultyLines(difficulty),
    "Operators: + - * / ^ % ! and parentheses. Constants: pi e tau phi.",
    "Degree trig (school): sind cosd tand asind acosd atand secd cscd cotd asecd acscd acotd.",
    "Radian trig: sin cos tan asin acos atan atan2 sec csc cot asec acsc acot.",
    "Hyperbolic: sinh cosh tanh asinh acosh atanh sech csch coth.",
    "Roots and powers: sqrt cbrt nthRoot hypot pow square cube exp expm1.",
    "Logs: log (natural), log(x, base), log2, log10, log1p. ln(x) and lg(x) are rewritten to log and log10.",
    "Rounding and order: abs sign floor ceil round fix min max.",
    "Number theory: gcd lcm mod invmod bitAnd bitOr, plus school helpers totient divisorSum divisorCount primeQ evenQ oddQ coprimeQ digitSum powmod fibonacci lucas.",
    "Combinatorics: factorial combinations permutations nCr nPr choose comb perm binomial combinationsWithRep catalan bellNumbers stirlingS2 composition multinomial3 subfactorial fallingFactorial risingFactorial doubleFactorial.",
    "Sequences: triangular pentagonal hexagonal tetrahedral squarePyramidal arithNth arithSum geoNth geoSum.",
    "Geometry params may be school letters a b c r R s h A B C or Greek alpha beta gamma theta phi, including olympiad r R ra ha ma wa d O I H.",
    "Geometry helpers: heron sasArea asaArea heightToSide inradius circumradius exradiusA medianTo bisectorTo lawCosSide lawSinSide semiperimeter equilateralArea, rectArea pythagHyp distance2, brahmagupta eulerInCirc powerPoint stewartD shoelace3 defectTriangle excessTriangle, and pi-coefficients circlePi circumferencePi sectorPi spherePi conePi cylinderPi frustumPi (coefficient of pi).",
    "Percent and algebra: percentOf percentWhat percentChange increaseBy decreaseBy discriminant quadraticRootP quadraticRootM slope lineAt midpoint lerp simpleInterest.",
    "Statistics of listed scalars (not arrays): sum prod mean median mad std variance.",
    "Special: gamma erf lgamma zeta bernoulli compare add subtract multiply divide.",
    "Use only the listed variable names. No arrays, matrices, random, assignment, or units.",
    "Do not emit proofs, inequalities without a numeric answer, matrices, or geometry constructions in this mode.",
    "instructionId must be one of: solve, evaluate, findDerivative, percentOf, missingSide, expand, factor, simplify.",
  ].join("\n");
}

function casDifficultyLines(difficulty?: ProblemDifficulty) {
  if (difficulty === "easy") {
    return [
      "REQUIRED difficulty: easy. One-step school tasks only.",
      "Quadratic examples: discriminant; f(k); vertex x=-b/(2a); a factorable root. Small integers.",
      "GOOD formula: discriminant(a,b,c) or a*k^2+b*k+c or quadraticRootP(a,b,c).",
    ];
  }
  if (difficulty === "medium") {
    return [
      "REQUIRED difficulty: medium. Two-step tasks, not a single plug-in.",
      "Quadratic examples: |x1-x2|; minimum -D/(4a); a Vieta sum or product used in a second step.",
      "GOOD formula: abs(quadraticRootP(a,b,c)-quadraticRootM(a,b,c)) or -discriminant(a,b,c)/(4*a).",
      "BAD as the whole problem: only 'find the discriminant' or only f(4).",
    ];
  }
  if (difficulty === "hard" || difficulty === "olympiad") {
    return [
      "REQUIRED difficulty: hard (including 'very hard'). Year 10–12 contest-style, still ONE numeric answer.",
      "A problem that is only discriminant, only vertex, only f(k), or only one root of a tiny quadratic is FORBIDDEN even if you label it hard.",
      "Quadratic MUST use several steps, for example:",
      "  x1^2+x2^2 via pow(-b/a,2)-2*(c/a);",
      "  |x1-x2| via abs(sqrt(discriminant(a,b,c))/a);",
      "  1/x1+1/x2 via (-b/a)/(c/a);",
      "  min/max value -discriminant(a,b,c)/(4*a) AND a second condition in the stem;",
      "  f(f(k)) nested: a*(a*k^2+b*k+c)^2+b*(a*k^2+b*k+c)+c;",
      "  (x1+x2)/(x1*x2).",
      "formula must contain at least two function calls OR at least four operators. Never a single discriminant(...) or quadraticRootP(...).",
      "Use mixed coefficients (not all |n|<6) so a student cannot see the answer by inspection.",
    ];
  }
  return [
    "Match difficulty to the teacher request. Easy = one plug-in. Hard = several algebraic steps.",
    "When the request is quadratic, vary the TASK: evaluate f(k); intercept; vertex; discriminant; a root; |x1-x2|; x1^2+x2^2; min value.",
    "GOOD easy: იპოვე $f(4)$, თუ $f(x)=2x^{2}-5x+3$. formula a*k^2+b*k+c.",
    "GOOD hard: იპოვე $x_1^{2}+x_2^{2}$ განტოლებისათვის $2x^{2}-7x+3=0$. formula pow(-b/a,2)-2*(c/a).",
    "BAD: $f(x)=ax^{2}+bx+c$ with letter coefficients, or labelling a discriminant as hard.",
  ];
}

function rewriteAliases(expr: string) {
  return expr
    .replace(/\bln\s*\(/g, "log(")
    .replace(/\blg\s*\(/g, "log10(")
    .replace(/\blb\s*\(/g, "log2(");
}

/** Turn common LaTeX / implicit-multiply drafts into math.js. */
export function normalizeMathJsFormula(raw: string) {
  let expr = rewriteAliases(raw.trim());
  expr = expr.replace(/\$+/g, "");
  expr = expr.replace(/\\[()[\]]/g, "");
  expr = expr.replace(/\\(?:left|right)/gi, "");
  expr = expr.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "(($1)/($2))");
  expr = expr.replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)");
  expr = expr.replace(/\\(?:cdot|times|cdotp)/gi, "*");
  expr = expr.replace(/\^\{([^{}]+)\}/g, "^($1)");
  expr = expr.replace(/[{}]/g, "");
  expr = expr.replace(/[−–—]/g, "-");
  expr = expr.replace(/[·×∙⋅]/g, "*");
  expr = expr.replace(/÷/g, "/");
  expr = expr.replace(/\*\*/g, "^");
  expr = expr.replace(/(\d)\s*([A-Za-z(])/g, "$1*$2");
  expr = insertIdentImplicitMul(expr);
  expr = expr.replace(/\)\s*\(/g, ")*(");
  expr = expr.replace(/\)\s*([A-Za-z])/g, ")*$1");
  return expr.replace(/\s+/g, " ").trim();
}

function insertIdentImplicitMul(expr: string) {
  return expr.replace(/([A-Za-z][A-Za-z0-9_]*)\s*\(/g, (full, name: string) =>
    ALLOWED_FUNCTIONS.has(name) ? full : `${name}*(`,
  );
}

export function sanitizeFormula(raw: string) {
  const expr = normalizeMathJsFormula(raw);
  if (!expr || expr.length > FORMULA_MAX) throw new Error("length");
  if (!ALLOWED_EXPR.test(expr) || BLOCKED.test(expr)) {
    throw new Error("unsafe");
  }
  return expr;
}

function scopeForFormula(formula: string, scope: Record<string, number>) {
  const names = formula.match(/[A-Za-z][A-Za-z0-9_]{0,23}/g) ?? [];
  const filtered: Record<string, number> = {};
  for (const name of names) {
    if (name in scope) filtered[name] = scope[name]!;
  }
  return filtered;
}

export function sanitizeVariables(
  entries: { name: string; value: number }[],
  options?: { allowReserved?: boolean },
): Record<string, number> {
  if (entries.length === 0 || entries.length > 12) {
    throw new Error("variables");
  }

  const variables: Record<string, number> = {};
  for (const entry of entries) {
    const name = entry.name.trim();
    if (!NAME.test(name) || (!options?.allowReserved && RESERVED.has(name))) {
      throw new Error("name");
    }
    if (name in variables) throw new Error("dup");
    if (!Number.isFinite(entry.value) || Math.abs(entry.value) > VARIABLE_ABS_MAX) {
      throw new Error("value");
    }
    variables[name] = entry.value;
  }
  return variables;
}

function functionName(node: MathNode): string | null {
  if (node.type !== "FunctionNode") return null;
  const fn = (node as MathNode & { fn?: { name?: string } }).fn;
  return typeof fn?.name === "string" ? fn.name : null;
}

function symbolName(node: MathNode): string | null {
  if (node.type !== "SymbolNode") return null;
  const name = (node as MathNode & { name?: string }).name;
  return typeof name === "string" ? name : null;
}

function assertSafeAst(node: MathNode, varNames: Set<string>) {
  node.traverse((child: MathNode) => {
    if (UNSAFE_NODES.has(child.type)) throw new Error("node");

    const fn = functionName(child);
    if (fn && !ALLOWED_FUNCTIONS.has(fn)) throw new Error("fn");

    const symbol = symbolName(child);
    if (
      symbol &&
      !CONSTANT_SET.has(symbol) &&
      !varNames.has(symbol) &&
      !ALLOWED_FUNCTIONS.has(symbol)
    ) {
      throw new Error("sym");
    }
  });
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Snap to an integer or a small-denominator fraction; otherwise reject. */
export function snapClean(value: number): number | null {
  if (!Number.isFinite(value) || Math.abs(value) > 1e9) return null;
  const nearestInt = Math.round(value);
  if (Math.abs(value - nearestInt) < 1e-8) return nearestInt;

  for (let d = 2; d <= 24; d += 1) {
    const num = Math.round(value * d);
    if (Math.abs(value * d - num) < 1e-8) return num / d;
  }
  return null;
}

export function numberToTex(value: number) {
  if (Number.isInteger(value)) return String(value);

  for (let d = 2; d <= 24; d += 1) {
    const num = Math.round(value * d);
    if (Math.abs(value * d - num) < 1e-8) {
      const g = gcd(num, d);
      const a = num / g;
      const b = d / g;
      if (b === 1) return String(a);
      if (a < 0) return `-\\frac{${-a}}{${b}}`;
      return `\\frac{${a}}{${b}}`;
    }
  }

  return formatNumber(value);
}

export function verifyFormula(
  rawFormula: string,
  rawVariables: { name: string; value: number }[],
): CasOk | CasFail {
  try {
    const formula = sanitizeFormula(rawFormula);
    const variables = sanitizeVariables(rawVariables, { allowReserved: true });
    const node = parse(formula);
    assertSafeAst(node, new Set(Object.keys(variables)));

    const compiled = node.compile();
    const raw = compiled.evaluate({
      ...CAS_SCOPE,
      ...variables,
    });

    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return { ok: false, reason: "nonreal" };
    }

    const value = snapClean(raw);
    if (value === null) return { ok: false, reason: "unclean" };

    return { ok: true, value, solutionTex: numberToTex(value) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unsafe";
    return { ok: false, reason };
  }
}
