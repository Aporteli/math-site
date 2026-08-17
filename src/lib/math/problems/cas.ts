import { parse, type MathNode } from "mathjs";
import { formatNumber } from "./tex";

const ALLOWED_EXPR = /^[0-9A-Za-z_+\-*/^().,\s]+$/;
const BLOCKED =
  /\b(constructor|prototype|window|document|Function|eval|globalThis|import|createUnit)\b/i;
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,11}$/;

const ALLOWED_FUNCTIONS = new Set([
  "sqrt",
  "abs",
  "hypot",
  "pow",
  "exp",
  "log",
  "log10",
  "ln",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "min",
  "max",
  "floor",
  "ceil",
  "round",
  "sign",
  "nthRoot",
  "square",
  "cube",
  "gcd",
  "lcm",
]);

const RESERVED = new Set(["pi", "e", "i", ...ALLOWED_FUNCTIONS]);

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

export type CasOk = {
  ok: true;
  value: number;
  solutionTex: string;
};

export type CasFail = { ok: false; reason: string };

export function sanitizeFormula(raw: string) {
  const expr = raw.trim();
  if (!expr || expr.length > 200) throw new Error("length");
  if (!ALLOWED_EXPR.test(expr) || BLOCKED.test(expr)) {
    throw new Error("unsafe");
  }
  return expr;
}

export function sanitizeVariables(
  entries: { name: string; value: number }[],
): Record<string, number> {
  if (entries.length === 0 || entries.length > 12) {
    throw new Error("variables");
  }

  const variables: Record<string, number> = {};
  for (const entry of entries) {
    const name = entry.name.trim();
    if (!NAME.test(name) || RESERVED.has(name)) throw new Error("name");
    if (name in variables) throw new Error("dup");
    if (!Number.isFinite(entry.value) || Math.abs(entry.value) > 100) {
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
    if (symbol && symbol !== "pi" && symbol !== "e" && !varNames.has(symbol)) {
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
  if (!Number.isFinite(value) || Math.abs(value) > 1e6) return null;
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
    const variables = sanitizeVariables(rawVariables);
    const node = parse(formula);
    assertSafeAst(node, new Set(Object.keys(variables)));

    const compiled = node.compile();
    const raw = compiled.evaluate({
      pi: Math.PI,
      e: Math.E,
      ...variables,
    });

    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return { ok: false, reason: "nonreal" };
    }

    const value = snapClean(raw);
    if (value === null) return { ok: false, reason: "unclean" };

    return { ok: true, value, solutionTex: numberToTex(value) };
  } catch {
    return { ok: false, reason: "unsafe" };
  }
}
