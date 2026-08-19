import type { ProblemDifficulty, ProblemYear } from "../types";
import type { ProblemTemplate, TemplateVariant } from "./schema";

export interface WorkRateSeed {
  id: string;
  difficulties: ProblemDifficulty[];
  years: ProblemYear[];
  stem: string;
  t: number;
  d: number;
  h1: number;
  h2: number;
}

function isThinRelay(template: ProblemTemplate) {
  if (template.variants.length !== 1) return false;
  const variant = template.variants[0];
  if (!variant) return false;
  const derivedT = variant.derived.t;
  return (
    variant.id === "alpha-beta" ||
    (typeof derivedT === "string" && derivedT.includes("2 * h1 + h2 - d"))
  );
}

function numberExample(
  example: TemplateVariant["example"],
  name: string,
  fallback: number,
) {
  const value = example?.[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asIntHours(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.abs(value - rounded) < 1e-6 ? rounded : fallback;
}

/** Alpha's solo time from the original relay story. */
export function relayAlphaHours(d: number, h1: number, h2: number) {
  const disc = (d - 2 * h1 - h2) ** 2 + 4 * h1 * d;
  if (!(disc >= 0)) return Number.NaN;
  return (2 * h1 + h2 - d + Math.sqrt(disc)) / 2;
}

function relayExample(seed: WorkRateSeed) {
  if (seed.t % 3 === 0 && seed.d === seed.t) {
    const n = seed.t / 3;
    const m = 2 * n - seed.h1;
    if (m >= 1 && seed.h2 === m * 3) return { n, k: 2, m };
  }
  if (seed.t % 4 === 0 && seed.d === 2 * seed.t) {
    const n = seed.t / 4;
    const m = 3 * n - seed.h1;
    if (m >= 1 && seed.h2 === m * 4) return { n, k: 3, m };
  }
  return { n: 4, k: 2, m: 2 };
}

/** Integer hours only: sample a small integer key, then derive the story. */
export function buildWorkRateFamily(seed: WorkRateSeed): ProblemTemplate {
  const relay: TemplateVariant = {
    id: "relay-then-slow",
    params: {
      n: { int: [3, 6], nonzero: true },
      k: { pick: [2, 3] },
      m: { int: [1, 4], nonzero: true },
    },
    derived: {
      t: "n * (k + 1)",
      h1: "k * n - m",
      h2: "m * (k + 1)",
      d: "(k - 1) * n * (k + 1)",
      tB: "k * n * (k + 1)",
    },
    constraints: ["h1 >= 2", "h2 >= 1", "d <= 24", "tB <= 40"],
    example: relayExample(seed),
    formula: "t",
    prompt: seed.stem,
    solutionSteps: [
      "\\text{Alpha } {{t}},\\ \\text{Beta } {{tB}}",
      "{{h1}}\\left(\\frac{1}{{{t}}} + \\frac{1}{{{tB}}}\\right) + {{h2}} \\cdot \\frac{1}{{{tB}}} = 1",
      "t = {{t}},\\quad t + {{d}} = {{tB}}",
    ],
  };

  const together: TemplateVariant = {
    id: "two-alone-together",
    params: {
      n: { int: [2, 5], nonzero: true },
      p: { pick: [3, 4] },
    },
    derived: {
      t: "n * (p - 1)",
      a: "n * p * (p - 1)",
      b: "n * p",
    },
    constraints: ["a > b", "a <= 36"],
    example: { n: 4, p: 3 },
    formula: "t",
    prompt:
      "კლასტერი ალფა მასივს დამოუკიდებლად {{a}} საათში ამუშავებს, კლასტერი ბეტა — {{b}} საათში. რამდენ საათში დაამუშავებენ მასივს ერთად?",
    solutionSteps: [
      "\\frac{1}{{{a}}} + \\frac{1}{{{b}}} = \\frac{{{a}} + {{b}}}{{{a}} {{b}}}",
      "t = \\frac{{{a}} {{b}}}{{{a}} + {{b}}} = {{t}}",
    ],
  };

  const fasterTogether: TemplateVariant = {
    id: "faster-finish-together",
    params: {
      n: { int: [2, 5], nonzero: true },
      k: { pick: [2, 3] },
    },
    derived: {
      t: "n * (k + 1)",
      d: "(k - 1) * n * (k + 1)",
      h: "k * n",
      tB: "k * n * (k + 1)",
    },
    constraints: ["h >= 2", "d <= 24"],
    example: { n: 4, k: 2 },
    formula: "t",
    prompt:
      "ალფა მასივს {{d}} საათით უფრო სწრაფად ამუშავებს, ვიდრე ბეტა. ერთად მასივს {{h}} საათში ამთავრებენ. რამდენ საათში დაამუშავებდა თითოეული კლასტერი დამოუკიდებლად?",
    solutionSteps: [
      "\\frac{1}{t} + \\frac{1}{t + {{d}}} = \\frac{1}{{{h}}}",
      "t = {{t}},\\quad t + {{d}} = {{tB}}",
    ],
  };

  const fastThenBoth: TemplateVariant = {
    id: "fast-then-both",
    params: {
      n: { int: [4, 7], nonzero: true },
      k: { pick: [2, 3] },
      m: { int: [1, 3], nonzero: true },
    },
    derived: {
      t: "n * (k + 1)",
      h2: "m * k",
      d: "(k - 1) * n * (k + 1)",
      h1: "(n - m) * (k + 1)",
      tB: "k * n * (k + 1)",
    },
    constraints: ["h1 >= 1", "t > h1", "d <= 24"],
    example: { n: 4, k: 2, m: 3 },
    formula: "t",
    prompt:
      "ალფამ დამოუკიდებლად იმუშავა {{h1}} საათი, შემდეგ ორივე კლასტერმა ერთად კიდევ {{h2}} საათი. ალფა {{d}} საათით უფრო სწრაფია ბეტაზე. რამდენ საათში დაამთავრებდა თითოეული მთელ მასივს მარტო?",
    solutionSteps: [
      "\\frac{{{h1}}}{{{t}}} + {{h2}}\\left(\\frac{1}{{{t}}} + \\frac{1}{{{tB}}}\\right) = 1",
      "t = {{t}},\\quad t + {{d}} = {{tB}}",
    ],
  };

  const inferOther: TemplateVariant = {
    id: "infer-other-from-together",
    params: {
      n: { int: [2, 5], nonzero: true },
      p: { pick: [3, 4] },
    },
    derived: {
      h: "n * (p - 1)",
      a: "n * p * (p - 1)",
      b: "n * p",
    },
    constraints: ["a > h", "a <= 36"],
    example: { n: 4, p: 3 },
    formula: "b",
    prompt:
      "ალფა მასივს მარტო {{a}} საათში ამუშავებს. ბეტასთან ერთად მასივს {{h}} საათში ამთავრებენ. რამდენ საათში დაამუშავებდა ბეტა მასივს დამოუკიდებლად?",
    solutionSteps: [
      "\\frac{1}{{{a}}} + \\frac{1}{b} = \\frac{1}{{{h}}}",
      "b = \\frac{{{a}} {{h}}}{{{a}} - {{h}}} = {{b}}",
    ],
  };

  const ratio: TemplateVariant = {
    id: "times-as-fast",
    params: {
      n: { int: [2, 4], nonzero: true },
      k: { pick: [2, 3, 4] },
    },
    derived: {
      h: "n * k",
      t: "n * (k + 1)",
      tB: "n * k * (k + 1)",
    },
    constraints: ["t > h", "tB <= 48"],
    example: { n: 4, k: 2 },
    formula: "tB",
    prompt:
      "ალფა ბეტაზე {{k}}-ჯერ სწრაფად მუშაობს. ერთად მასივს {{h}} საათში ამთავრებენ. რამდენ საათში დაამუშავებდა ბეტა მასივს მარტო?",
    solutionSteps: [
      "\\frac{{{k}}}{t_{\\mathrm{B}}} + \\frac{1}{t_{\\mathrm{B}}} = \\frac{1}{{{h}}}",
      "t_{\\mathrm{B}} = {{h}}({{k}} + 1) = {{tB}}",
    ],
  };

  return {
    id: seed.id,
    topic: "equations",
    difficulties: seed.difficulties,
    years: seed.years,
    instructionId: "solve",
    variants: [relay, together, fasterTogether, fastThenBoth, inferOther, ratio],
  };
}

export function expandWorkRateFamily(template: ProblemTemplate): ProblemTemplate {
  if (!isThinRelay(template)) return template;
  const variant = template.variants[0]!;
  const d = numberExample(variant.example, "d", 12);
  const h1 = numberExample(variant.example, "h1", 6);
  const h2 = numberExample(variant.example, "h2", 6);
  const t = numberExample(
    variant.example,
    "t",
    asIntHours(relayAlphaHours(d, h1, h2), h1 + h2),
  );
  return buildWorkRateFamily({
    id: template.id,
    difficulties: template.difficulties,
    years: template.years,
    stem: variant.prompt,
    t,
    d,
    h1,
    h2,
  });
}

export function workRateHoursFromEquation(equation: string) {
  const compact = equation.replace(/\s+/g, "");
  const full = compact.match(
    /^(\d+)\*\(1\/t\+1\/\(t\+(\d+)\)\)\+(\d+)\*\(1\/\(t\+\2\)\)=1$/,
  );
  if (full) {
    return {
      h1: Number(full[1]),
      d: Number(full[2]),
      h2: Number(full[3]),
    };
  }
  const short = compact.match(/^(\d+)\/t\+(\d+)\/\(t\+(\d+)\)=1$/);
  if (short) {
    const together = Number(short[1]);
    const betaHours = Number(short[2]);
    const gap = Number(short[3]);
    if (betaHours > together) {
      return { h1: together, d: gap, h2: betaHours - together };
    }
  }
  const latex = equation
    .replace(/\\frac\s*\{(\d+)\}\s*\{t\}/g, "$1/t")
    .replace(/\\frac\s*\{(\d+)\}\s*\{t\s*\+\s*(\d+)\}/g, "$1/(t+$2)")
    .replace(/\\times/g, "*")
    .replace(/\s+/g, "");
  if (latex !== compact) return workRateHoursFromEquation(latex);
  return null;
}

export function slotWorkRateStory(
  statement: string,
  d: number,
  h1: number,
  h2: number,
) {
  const ka = statement
    .replace(new RegExp(`(${d})(\\s*საათით უფრო)`), "{{d}}$2")
    .replace(new RegExp(`(იმუშავა\\s+)${h1}(\\s*საათ)`), "$1{{h1}}$2")
    .replace(new RegExp(`(კიდევ\\s+)${h2}(\\s*საათ)`), "$1{{h2}}$2");
  if (ka.includes("{{d}}") && ka.includes("{{h1}}") && ka.includes("{{h2}}")) {
    return ka;
  }

  let out = statement;
  const replaceFirst = (value: number, slot: string) => {
    out = out.replace(new RegExp(`(?<!\\d)${value}(?!\\d)`), `{{${slot}}}`);
  };
  replaceFirst(d, "d");
  replaceFirst(h1, "h1");
  replaceFirst(h2, "h2");
  if (out.includes("{{d}}") && out.includes("{{h1}}") && out.includes("{{h2}}")) {
    return out;
  }
  return "Cluster Alpha is {{d}} hours faster than Cluster Beta. Together they work {{h1}} hours, then Beta finishes the rest in {{h2}} hours. How long would each take alone?";
}
