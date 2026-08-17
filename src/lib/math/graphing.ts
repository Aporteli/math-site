import { compile, derivative, parse, type MathNode } from "mathjs";

export const CURVE_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#d97706",
  "#0d9488",
] as const;

export type CurveColor = (typeof CURVE_COLORS)[number];

export const DEFAULT_DOMAIN: [number, number] = [-10, 10];

export type GraphPresetId = "parabola" | "trig" | "hyperbola" | "cubic" | "params";

export interface GraphFunction {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
  error: boolean;
  tex: string;
  params: Record<string, number>;
}

export const GRAPH_PRESETS: Record<GraphPresetId, string[]> = {
  parabola: ["x^2 - 3", "x + 1"],
  trig: ["sin(x)", "cos(x)"],
  hyperbola: ["1/x"],
  cubic: ["x^3 - 3*x"],
  params: ["a*x^2 + b*x + c", "sin(k*x)"],
};

export const PARAM_NAMES = ["a", "b", "c", "k"] as const;
export type ParamName = (typeof PARAM_NAMES)[number];

export const PARAM_DEFAULTS: Record<ParamName, number> = {
  a: 1,
  b: 1,
  c: 0,
  k: 1,
};

const PARAM_SET = new Set<string>(PARAM_NAMES);

const ALLOWED_EXPR = /^[0-9A-Za-z_+\-*/^().,\s]+$/;
const BLOCKED = /\b(constructor|prototype|window|document|Function|eval|globalThis)\b/i;

export function createFunctionId() {
  return `fn-${Math.random().toString(36).slice(2, 9)}`;
}

export function nextCurveColor(index: number) {
  return CURVE_COLORS[index % CURVE_COLORS.length];
}

export function makeGraphFunction(
  expr: string,
  color: string,
  visible = true,
): GraphFunction {
  const checked = inspectExpression(expr);
  return {
    id: createFunctionId(),
    expr,
    color,
    visible,
    error: !checked.ok,
    tex: checked.ok ? checked.tex : "",
    params: defaultParamsFor(expr),
  };
}

export function functionsFromExprs(exprs: string[]): GraphFunction[] {
  return exprs.map((expr, index) =>
    makeGraphFunction(expr, nextCurveColor(index)),
  );
}

function toMathjs(expr: string) {
  return expr.replaceAll("PI", "pi").replaceAll("E", "e");
}

export function sanitizeExpression(raw: string) {
  const expr = raw.trim();
  if (!expr) throw new Error("empty");
  if (!ALLOWED_EXPR.test(expr) || BLOCKED.test(expr)) {
    throw new Error("unsafe");
  }
  return expr;
}

export function toPlotExpression(raw: string) {
  return toMathjs(sanitizeExpression(raw));
}

export function inspectExpression(raw: string): { ok: true; tex: string } | { ok: false } {
  try {
    const expr = sanitizeExpression(raw);
    const node = parse(toMathjs(expr));
    return { ok: true, tex: node.toTex() };
  } catch {
    return { ok: false };
  }
}

export function detectParameters(raw: string): ParamName[] {
  try {
    const node = parse(toMathjs(sanitizeExpression(raw)));
    const names = new Set<ParamName>();
    node.traverse((child: MathNode) => {
      if (child.type === "SymbolNode") {
        const name = (child as MathNode & { name: string }).name;
        if (PARAM_SET.has(name)) names.add(name as ParamName);
      }
    });
    return PARAM_NAMES.filter((name) => names.has(name));
  } catch {
    return [];
  }
}

export function defaultParamsFor(raw: string): Record<string, number> {
  const params: Record<string, number> = {};
  for (const name of detectParameters(raw)) {
    params[name] = PARAM_DEFAULTS[name];
  }
  return params;
}

export function mergeParams(
  expr: string,
  previous: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const name of detectParameters(expr)) {
    next[name] =
      previous[name] !== undefined ? previous[name] : PARAM_DEFAULTS[name];
  }
  return next;
}

export type CompiledFn = (x: number) => number | null;

function scopeFrom(params: Record<string, number>) {
  return { pi: Math.PI, e: Math.E, ...params };
}

export function compileEvaluator(
  raw: string,
  params: Record<string, number> = {},
): CompiledFn {
  try {
    const compiled = compile(toPlotExpression(raw));
    const base = scopeFrom(params);
    return (x: number) => {
      try {
        const value = compiled.evaluate({ ...base, x });
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? n : null;
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
}

export function derivativeOf(raw: string) {
  try {
    const expr = sanitizeExpression(raw);
    return derivative(toMathjs(expr), "x").toString();
  } catch {
    return null;
  }
}

export function compileDerivative(
  raw: string,
  params: Record<string, number> = {},
): CompiledFn {
  const derived = derivativeOf(raw);
  if (!derived) return () => null;
  try {
    const compiled = compile(derived);
    const base = scopeFrom(params);
    return (x: number) => {
      try {
        const value = compiled.evaluate({ ...base, x });
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? n : null;
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
}

export function compileSecondDerivative(
  raw: string,
  params: Record<string, number> = {},
): CompiledFn {
  try {
    const first = derivative(toMathjs(sanitizeExpression(raw)), "x");
    const second = derivative(first, "x").toString();
    const compiled = compile(second);
    const base = scopeFrom(params);
    return (x: number) => {
      try {
        const value = compiled.evaluate({ ...base, x });
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? n : null;
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
}

export function formatGraphNumber(value: number, digits = 3) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.abs(value) < 10 ** -digits / 2 ? 0 : value;
  return String(Number(rounded.toFixed(digits)));
}
