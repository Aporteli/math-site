import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/types";
import { replaceTokens } from "../../catalog";
import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  distinctNonzero,
  linear,
  quadratic,
  signed,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

type GraphingCopy =
  Dictionary["dashboard"]["teacher"]["problemBank"]["basicGraphing"];
type GraphingId = keyof GraphingCopy["templates"];

function point(x: number, y: number): string {
  return `(${x}, ${y})`;
}

function lineEq(m: number, b: number): string {
  return `y = ${linear(m, b, "x")}`;
}

function vertexEq(a: number, h: number, k: number): string {
  const inner = h === 0 ? "x" : `(x ${signed(-h)})`;
  const sq = `${inner}^2`;
  const lead = a === 1 ? sq : a === -1 ? `-${sq}` : `${a}${sq}`;
  return k === 0 ? `y = ${lead}` : `y = ${lead} ${signed(k)}`;
}

function vertexJs(a: number, h: number, k: number): string {
  const inner = h === 0 ? "x" : h > 0 ? `(x-${h})` : `(x+${-h})`;
  const sq = `${inner}^2`;
  const lead = a === 1 ? sq : a === -1 ? `-${sq}` : `${a}*${sq}`;
  if (k === 0) return lead;
  return `${lead}${k > 0 ? "+" : ""}${k}`;
}

function absEq(a: number, h: number, k: number): string {
  const inner = h === 0 ? "|x|" : `|x ${signed(-h)}|`;
  const lead = a === 1 ? inner : a === -1 ? `-${inner}` : `${a}${inner}`;
  return k === 0 ? `y = ${lead}` : `y = ${lead} ${signed(k)}`;
}

function absJs(a: number, h: number, k: number): string {
  const inner = h === 0 ? "abs(x)" : h > 0 ? `abs(x-${h})` : `abs(x+${-h})`;
  const lead = a === 1 ? inner : a === -1 ? `-${inner}` : `${a}*${inner}`;
  if (k === 0) return lead;
  return `${lead}${k > 0 ? "+" : ""}${k}`;
}

function graphing(
  copy: GraphingCopy,
  id: GraphingId,
  instructionId: GeneratedProblem["instructionId"],
  tokens: Record<string, string | number>,
  graphExpr = "",
): GeneratedProblem {
  const template = copy.templates[id];
  return {
    instructionId,
    promptTex: replaceTokens(template.prompt, tokens),
    solutionTex: replaceTokens(template.solution, tokens),
    graphExpr,
  } as GeneratedProblem;
}

export const basicGraphingProblem = defineAlgebraProblem(
  "basic-graphing",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty, locale }): GeneratedProblem => {
    const dict = getDictionary(locale ?? defaultLocale);
    const copy = dict.dashboard.teacher.problemBank.basicGraphing;

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        () => {
          const x = nonzero(rng, -8, 8);
          const y = nonzero(rng, -8, 8);
          const quad =
            x > 0 && y > 0 ? "I" : x < 0 && y > 0 ? "II" : x < 0 && y < 0 ? "III" : "IV";
          return graphing(copy, "quadrant", "evaluate", {
            point: point(x, y),
            x: quad,
          });
        },

        () => {
          const x = nonzero(rng, -8, 8);
          return graphing(copy, "on-x-axis", "evaluate", {
            point: point(x, 0),
          });
        },

        () => {
          const y = nonzero(rng, -8, 8);
          return graphing(copy, "on-y-axis", "evaluate", {
            point: point(0, y),
          });
        },

        () => {
          const x = nonzero(rng, -6, 6);
          const k = nonzero(rng, -6, 6);
          return graphing(
            copy,
            "horizontal-line",
            "solve",
            { point: point(x, k), k },
            String(k),
          );
        },

        () => {
          const k = nonzero(rng, -6, 6);
          const y = nonzero(rng, -6, 6);
          return graphing(copy, "vertical-line", "solve", {
            point: point(k, y),
            k,
          });
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const x = randInt(rng, 1, 6);
          return graphing(
            copy,
            "slope-origin",
            "evaluate",
            { point: point(x, m * x), m },
            linear(m, 0, "x").replace(/ /g, ""),
          );
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const b = nonzero(rng, -8, 8);
          return graphing(
            copy,
            "y-intercept",
            "evaluate",
            { eq: lineEq(m, b), intercept: point(0, b) },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const r = nonzero(rng, -6, 6);
          const b = -m * r;
          return graphing(
            copy,
            "x-intercept",
            "evaluate",
            { eq: lineEq(m, b), intercept: point(r, 0) },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const b = randInt(rng, -8, 8);
          const k = nonzero(rng, -5, 5);
          return graphing(
            copy,
            "linear-value",
            "evaluate",
            { eq: lineEq(m, b), k, y: m * k + b },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const b = randInt(rng, -8, 8);
          const x = nonzero(rng, -5, 5);
          return graphing(
            copy,
            "point-on-line",
            "evaluate",
            { eq: lineEq(m, b), x, y: m * x + b },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const y = randInt(rng, -6, 6);
          const x1 = randInt(rng, -6, 2);
          const x2 = x1 + randInt(rng, 2, 6);
          return graphing(
            copy,
            "slope-horizontal",
            "evaluate",
            { p1: point(x1, y), p2: point(x2, y) },
            String(y),
          );
        },

        () => {
          const run = randInt(rng, 1, 5);
          const m = nonzero(rng, -4, 4);
          const rise = m * run;
          return graphing(copy, "slope-rise-run", "evaluate", {
            run,
            rise,
            m,
          });
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        () => {
          const x1 = randInt(rng, -6, 4);
          const y1 = randInt(rng, -6, 6);
          const dx = nonzero(rng, -5, 5);
          const m = nonzero(rng, -4, 4);
          const x2 = x1 + dx;
          const y2 = y1 + m * dx;
          return graphing(
            copy,
            "slope-two-points",
            "evaluate",
            {
              p1: point(x1, y1),
              p2: point(x2, y2),
              x1,
              y1,
              x2,
              y2,
              m,
            },
            linear(m, y1 - m * x1, "x").replace(/ /g, ""),
          );
        },

        () => {
          const h = randInt(rng, -5, 5);
          const k = randInt(rng, -5, 5);
          const dx = randInt(rng, 1, 4);
          const dy = randInt(rng, 1, 4);
          return graphing(copy, "midpoint", "evaluate", {
            p1: point(h - dx, k - dy),
            p2: point(h + dx, k + dy),
            mid: point(h, k),
          });
        },

        () => {
          const scale = randInt(rng, 1, 2);
          const a = 3 * scale;
          const b = 4 * scale;
          const swap = rng() < 0.5;
          const dx = (rng() < 0.5 ? 1 : -1) * (swap ? a : b);
          const dy = (rng() < 0.5 ? 1 : -1) * (swap ? b : a);
          const x1 = randInt(rng, -4, 4);
          const y1 = randInt(rng, -4, 4);
          return graphing(copy, "distance", "evaluate", {
            p1: point(x1, y1),
            p2: point(x1 + dx, y1 + dy),
            x1,
            y1,
            x2: x1 + dx,
            y2: y1 + dy,
            d: 5 * scale,
          });
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const b = randInt(rng, -8, 8);
          return graphing(
            copy,
            "write-slope-intercept",
            "solve",
            { m, b, eq: lineEq(m, b) },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const x0 = randInt(rng, -5, 5);
          const y0 = randInt(rng, -6, 6);
          const b = y0 - m * x0;
          return graphing(
            copy,
            "point-slope",
            "solve",
            { point: point(x0, y0), m, eq: lineEq(m, b) },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const b1 = randInt(rng, -6, 6);
          const x0 = randInt(rng, -5, 5);
          const y0 = m * x0 + b1 + nonzero(rng, -4, 4);
          const b = y0 - m * x0;
          return graphing(
            copy,
            "parallel-line",
            "solve",
            {
              eq1: lineEq(m, b1),
              point: point(x0, y0),
              eq: lineEq(m, b),
            },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const a = pick(rng, [2, 3, 4, 5] as const);
          const k = nonzero(rng, -4, 4);
          const b = a * k;
          return graphing(
            copy,
            "standard-intercepts",
            "evaluate",
            {
              eq: `\\dfrac{x}{${a}} + \\dfrac{y}{${b}} = 1`,
              xint: point(a, 0),
              yint: point(0, b),
            },
            linear(-k, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const x1 = randInt(rng, -5, 3);
          const y1 = randInt(rng, -6, 6);
          const dx = nonzero(rng, -5, 5);
          const m = nonzero(rng, -4, 4);
          const x2 = x1 + dx;
          const y2 = y1 + m * dx;
          const b = y1 - m * x1;
          return graphing(
            copy,
            "two-points-equation",
            "solve",
            {
              p1: point(x1, y1),
              p2: point(x2, y2),
              eq: lineEq(m, b),
            },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const m = nonzero(rng, -5, 5);
          const r = nonzero(rng, -6, 6);
          const b = -m * r;
          return graphing(
            copy,
            "both-intercepts",
            "evaluate",
            {
              eq: lineEq(m, b),
              xint: point(r, 0),
              yint: point(0, b),
            },
            linear(m, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const k = nonzero(rng, -5, 5);
          return graphing(
            copy,
            "abs-vertex",
            "evaluate",
            { eq: absEq(1, 0, k), vertex: point(0, k) },
            absJs(1, 0, k),
          );
        },

        () => {
          const k = nonzero(rng, -6, 6);
          return graphing(
            copy,
            "parabola-shift",
            "evaluate",
            { eq: `y = x^2 ${signed(k)}`, vertex: point(0, k) },
            `x^2${k > 0 ? "+" : ""}${k}`,
          );
        },

        () => {
          const x = randInt(rng, -4, 4);
          const y = randInt(rng, -5, 5);
          const m1 = nonzero(rng, -4, 4);
          const m2 = distinctNonzero(rng, -4, 4, [m1]);
          const b1 = y - m1 * x;
          const b2 = y - m2 * x;
          return graphing(
            copy,
            "lines-intersect",
            "evaluate",
            {
              eq1: lineEq(m1, b1),
              eq2: lineEq(m2, b2),
              point: point(x, y),
            },
            linear(m1, b1, "x").replace(/ /g, ""),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        () => {
          const m = pick(rng, [1, -1] as const);
          const b1 = randInt(rng, -6, 6);
          const x0 = randInt(rng, -5, 5);
          const y0 = randInt(rng, -5, 5);
          const mp = -m;
          const b = y0 - mp * x0;
          return graphing(
            copy,
            "perpendicular-line",
            "solve",
            {
              eq1: lineEq(m, b1),
              point: point(x0, y0),
              eq: lineEq(mp, b),
            },
            linear(mp, b, "x").replace(/ /g, ""),
          );
        },

        () => {
          const a = pick(rng, [1, -1, 2, -2] as const);
          const h = nonzero(rng, -4, 4);
          const k = randInt(rng, -5, 5);
          return graphing(
            copy,
            "vertex-form",
            "evaluate",
            { eq: vertexEq(a, h, k), vertex: point(h, k) },
            vertexJs(a, h, k),
          );
        },

        () => {
          const h = nonzero(rng, -4, 4);
          const k = randInt(rng, -5, 5);
          const expanded = quadratic(1, -2 * h, h * h + k, "x");
          return graphing(
            copy,
            "complete-square",
            "evaluate",
            {
              eq: `y = ${expanded}`,
              eq2: vertexEq(1, h, k),
              vertex: point(h, k),
            },
            vertexJs(1, h, k),
          );
        },

        () => {
          const p = nonzero(rng, -6, 6);
          const q = distinctNonzero(rng, -6, 6, [p]);
          return graphing(
            copy,
            "parabola-x-intercepts",
            "evaluate",
            {
              eq: `y = ${quadratic(1, -(p + q), p * q, "x")}`,
              p1: point(p, 0),
              p2: point(q, 0),
            },
            quadratic(1, -(p + q), p * q, "x").replace(/ /g, ""),
          );
        },

        () => {
          const a = pick(rng, [1, -1, 2] as const);
          const h = nonzero(rng, -4, 4);
          const c = randInt(rng, -6, 6);
          const b = -2 * a * h;
          return graphing(
            copy,
            "axis-symmetry",
            "evaluate",
            { eq: `y = ${quadratic(a, b, c, "x")}`, h },
            quadratic(a, b, c, "x").replace(/ /g, ""),
          );
        },

        () => {
          const h = randInt(rng, -4, 4);
          const k = randInt(rng, -4, 4);
          const r = randInt(rng, 2, 6);
          const innerX = h === 0 ? "x^2" : `(x ${signed(-h)})^2`;
          const innerY = k === 0 ? "y^2" : `(y ${signed(-k)})^2`;
          return graphing(copy, "circle-center", "evaluate", {
            eq: `${innerX} + ${innerY} = ${r * r}`,
            center: point(h, k),
            r,
          });
        },

        () => {
          const r = nonzero(rng, -4, 4);
          const s = distinctNonzero(rng, -4, 4, [r]);
          const m = r + s;
          const c = -r * s;
          return graphing(
            copy,
            "line-parabola",
            "evaluate",
            {
              eq1: "y = x^2",
              eq2: lineEq(m, c),
              p1: point(r, r * r),
              p2: point(s, s * s),
            },
            "x^2",
          );
        },

        () => {
          const a = pick(rng, [1, -1, 2, -2] as const);
          const h = nonzero(rng, -4, 4);
          const k = randInt(rng, -5, 5);
          return graphing(
            copy,
            "abs-scaled",
            "evaluate",
            { eq: absEq(a, h, k), vertex: point(h, k) },
            absJs(a, h, k),
          );
        },

        () => {
          const m = 2;
          const b = randInt(rng, -4, 4) * 2;
          const inv =
            b === 0
              ? "y = \\dfrac{x}{2}"
              : `y = \\dfrac{x ${signed(-b)}}{2}`;
          return graphing(
            copy,
            "inverse-linear",
            "solve",
            { eq: lineEq(m, b), inv },
            b === 0 ? "x/2" : `(x${b > 0 ? "-" : "+"}${Math.abs(b)})/2`,
          );
        },

        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -5, 5);
          const c = nonzero(rng, -8, 8);
          return graphing(
            copy,
            "quadratic-y-intercept",
            "evaluate",
            {
              eq: `y = ${quadratic(a, b, c, "x")}`,
              intercept: point(0, c),
            },
            quadratic(a, b, c, "x").replace(/ /g, ""),
          );
        },

        () => {
          const kind = pick(rng, [0, 1, 2] as const);
          if (kind === 2) {
            const p = nonzero(rng, -5, 5);
            const q = distinctNonzero(rng, -5, 5, [p]);
            return graphing(
              copy,
              "intercept-count",
              "evaluate",
              {
                eq: `y = ${quadratic(1, -(p + q), p * q, "x")}`,
                n: 2,
              },
              quadratic(1, -(p + q), p * q, "x").replace(/ /g, ""),
            );
          }
          if (kind === 1) {
            const p = nonzero(rng, -4, 4);
            return graphing(
              copy,
              "intercept-count",
              "evaluate",
              {
                eq: `y = ${quadratic(1, -2 * p, p * p, "x")}`,
                n: 1,
              },
              vertexJs(1, p, 0),
            );
          }
          const q = randInt(rng, 1, 6);
          return graphing(
            copy,
            "intercept-count",
            "evaluate",
            { eq: `y = x^2 ${signed(q)}`, n: 0 },
            `x^2+${q}`,
          );
        },

        () => {
          const a = pick(rng, [1, -1, 2, -2] as const);
          const h = randInt(rng, -4, 4);
          const k = randInt(rng, -5, 5);
          return graphing(
            copy,
            "parabola-range",
            "evaluate",
            {
              eq: vertexEq(a, h, k),
              rel: a > 0 ? "\\ge" : "\\le",
              k,
            },
            vertexJs(a, h, k),
          );
        },
      ],
    };

    const generateSelectedTemplate = pick(
      rng,
      templatesByDifficulty[difficulty],
    );
    return generateSelectedTemplate();
  },
);
