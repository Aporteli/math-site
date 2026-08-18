import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/types";
import { replaceTokens } from "../../catalog";
import type { GeneratedProblem } from "../types";
import { defineAlgebraProblem, selectVariable } from "./helpers";
import { nonzero, pick, randInt } from "../rng";

type WordProblemCopy =
  Dictionary["dashboard"]["teacher"]["problemBank"]["wordProblems"];
type WordProblemId = keyof WordProblemCopy["templates"];

function story(
  copy: WordProblemCopy,
  rng: () => number,
  id: WordProblemId,
  instructionId: GeneratedProblem["instructionId"],
  tokens: Record<string, string | number>,
): GeneratedProblem {
  const name = pick(rng, copy.names);
  let name2 = pick(rng, copy.names);
  while (name2 === name && copy.names.length > 1) {
    name2 = pick(rng, copy.names);
  }
  const values = { name, name2, ...tokens };
  const template = copy.templates[id];
  return {
    instructionId,
    promptTex: replaceTokens(template.prompt, values),
    solutionTex: replaceTokens(template.solution, values),
  } as GeneratedProblem;
}

export const wordProblemsProblem = defineAlgebraProblem(
  "word-problems",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty, locale }): GeneratedProblem => {
    const dict = getDictionary(locale ?? defaultLocale);
    const copy = dict.dashboard.teacher.problemBank.wordProblems;
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      easy: [
        () => {
          const a = randInt(rng, 8, 16);
          const b = randInt(rng, 2, 8);
          return story(copy, rng, "age-in-years", "evaluate", {
            a,
            b,
            x: a + b,
          });
        },
        () => {
          const a = randInt(rng, 6, 12);
          const b = randInt(rng, 2, 7);
          return story(copy, rng, "age-years-ago", "evaluate", {
            a,
            b,
            x: a + b,
          });
        },
        () => {
          const x = nonzero(rng, 4, 18);
          const a = randInt(rng, 2, 12);
          return story(copy, rng, "number-plus-equals", "solve", {
            a,
            b: x + a,
            x,
            variable,
          });
        },
        () => {
          const x = randInt(rng, 3, 12);
          const a = randInt(rng, 1, 9);
          return story(copy, rng, "number-twice-plus", "solve", {
            a,
            b: 2 * x + a,
            x,
            variable,
          });
        },
        () => {
          const x = randInt(rng, 5, 20);
          return story(copy, rng, "consecutive-sum", "solve", {
            s: x + (x + 1),
            x,
            y: x + 1,
            variable,
          });
        },
        () => {
          const l = randInt(rng, 5, 18);
          const w = randInt(rng, 3, 12);
          return story(copy, rng, "rectangle-perimeter", "evaluate", {
            l,
            w,
            x: 2 * (l + w),
          });
        },
        () => {
          const n = randInt(rng, 3, 12);
          const p = randInt(rng, 2, 15);
          return story(copy, rng, "items-total-cost", "evaluate", {
            n,
            p,
            x: n * p,
          });
        },
        () => {
          const v = randInt(rng, 30, 90);
          const t = randInt(rng, 2, 6);
          return story(copy, rng, "distance-speed-time", "evaluate", {
            v,
            t,
            x: v * t,
          });
        },
        () => {
          const x = randInt(rng, 8, 40);
          return story(copy, rng, "split-money", "evaluate", {
            total: 2 * x,
            x,
          });
        },
        () => {
          const read = randInt(rng, 20, 80);
          const x = randInt(rng, 10, 60);
          return story(copy, rng, "pages-left", "evaluate", {
            total: read + x,
            read,
            x,
          });
        },
        () => {
          const x = randInt(rng, 8, 30);
          const a = randInt(rng, 2, 15);
          return story(copy, rng, "more-than-sum", "solve", {
            a,
            s: 2 * x + a,
            x,
            variable,
          });
        },
        () => {
          const x = randInt(rng, 4, 20) * 2;
          const a = randInt(rng, 1, 9);
          return story(copy, rng, "half-of-plus", "solve", {
            a,
            b: x / 2 + a,
            x,
            variable,
          });
        },
      ],

      medium: [
        () => {
          const x = randInt(rng, 6, 18);
          return story(copy, rng, "age-twice-sum", "solve", {
            s: 3 * x,
            x,
            variable,
          });
        },
        () => {
          const z = randInt(rng, 4, 16);
          const x = z + randInt(rng, 3, 12);
          const s = x + z;
          const d = x - z;
          return story(copy, rng, "sum-and-difference", "solve", {
            s,
            d,
            x,
            y: "y",
            z,
            variable,
          });
        },
        () => {
          const a = 1;
          const b = 2;
          const x = randInt(rng, 3, 12);
          const rest = randInt(rng, 3, 12);
          const n = x + rest;
          const total = a * x + b * rest;
          return story(copy, rng, "coins-two-kinds", "solve", {
            n,
            a,
            b,
            total,
            x,
            variable,
          });
        },
        () => {
          const x = randInt(rng, 2, 16) * 2;
          return story(copy, rng, "consecutive-even", "solve", {
            s: x + (x + 2) + (x + 4),
            x,
            variable,
          });
        },
        () => {
          const x = randInt(rng, 3, 12);
          const a = randInt(rng, 2, 8);
          return story(copy, rng, "rectangle-area", "solve", {
            a,
            area: x * (x + a),
            x,
            variable,
          });
        },
        () => {
          const adult = randInt(rng, 8, 20);
          const child = randInt(rng, 3, 7);
          const x = randInt(rng, 4, 15);
          const kids = randInt(rng, 4, 15);
          const n = x + kids;
          return story(copy, rng, "tickets-two-prices", "solve", {
            adult,
            child,
            n,
            total: adult * x + child * kids,
            x,
            variable,
          });
        },
        () => {
          const v1 = randInt(rng, 40, 90);
          const v2 = randInt(rng, 40, 90);
          const x = randInt(rng, 2, 6);
          return story(copy, rng, "two-trains", "evaluate", {
            v1,
            v2,
            dist: x * (v1 + v2),
            x,
          });
        },
        () => {
          const a = randInt(rng, 6, 12);
          const b = randInt(rng, 1, a - 1);
          return story(copy, rng, "work-remaining", "evaluate", {
            a,
            b,
            x: a - b,
          });
        },
        () => {
          const a = randInt(rng, 1, 5);
          const b = randInt(rng, 1, 5);
          const k = randInt(rng, 3, 8);
          return story(copy, rng, "mixture-ratio-parts", "evaluate", {
            a,
            b,
            total: k * (a + b),
            x: k * a,
          });
        },
        () => {
          const p = pick(rng, [10, 20, 25, 50] as const);
          const x = 20 * randInt(rng, 2, 5);
          return story(copy, rng, "percent-find-whole", "solve", {
            p,
            part: (p * x) / 100,
            x,
            variable,
          });
        },
        () => {
          const x = randInt(rng, 4, 14);
          const b = randInt(rng, 2, 6);
          const a = 2 * (x + b);
          return story(copy, rng, "two-ages-now", "solve", {
            a,
            b,
            x,
            variable,
          });
        },
        () => {
          const a = randInt(rng, 20, 45) * 2;
          const x = randInt(rng, 20, 50) * 2;
          return story(copy, rng, "mean-of-two", "solve", {
            a,
            m: (a + x) / 2,
            x,
            variable,
          });
        },
      ],

      hard: [
        () => {
          const a = randInt(rng, 1, 9);
          const b = randInt(rng, 0, 9);
          return story(copy, rng, "two-digit-value", "evaluate", {
            a,
            b,
            x: 10 * a + b,
          });
        },
        () => {
          const t = randInt(rng, 1, 3) * 2;
          const a = t * 3;
          const b = (t * 3) / 2;
          return story(copy, rng, "work-together", "evaluate", {
            a,
            b,
            x: t,
          });
        },
        () => {
          const n1 = randInt(rng, 2, 8);
          const n2 = randInt(rng, 2, 8);
          const p1 = pick(rng, [10, 20, 30, 40] as const);
          const p2 = pick(rng, [50, 60, 70, 80] as const);
          const x = (n1 * p1 + n2 * p2) / (n1 + n2);
          return story(copy, rng, "mixture-percent", "evaluate", {
            n1,
            n2,
            p1,
            p2,
            x: Number.isInteger(x) ? x : Math.round(x * 10) / 10,
          });
        },
        () => {
          const c = randInt(rng, 2, 6);
          const x = randInt(rng, 8, 20);
          return story(copy, rng, "boat-current", "evaluate", {
            b: x + c,
            c,
            x,
          });
        },
        () => {
          const x = randInt(rng, 1, 5);
          const y = randInt(rng, 2, 8);
          const n1 = 2;
          const n2 = 3;
          const m1 = 4;
          const m2 = 1;
          return story(copy, rng, "two-goods-prices", "solve", {
            n1,
            n2,
            m1,
            m2,
            t1: n1 * x + n2 * y,
            t2: m1 * x + m2 * y,
            x,
            variable,
          });
        },
        () => {
          const a = randInt(rng, 3, 8);
          const b = randInt(rng, 2, 10);
          const x = a + b;
          return story(copy, rng, "age-past-twice", "solve", {
            a,
            b,
            x,
            variable,
          });
        },
        () => {
          const p = pick(rng, [200, 400, 500, 1000] as const);
          const r = pick(rng, [4, 5, 8, 10] as const);
          const t = randInt(rng, 2, 5);
          return story(copy, rng, "simple-interest", "evaluate", {
            p,
            r,
            t,
            x: (p * r * t) / 100,
          });
        },
        () => {
          const d = pick(rng, [60, 120, 180] as const);
          const v1 = pick(rng, [40, 60, 80] as const);
          const v2 = pick(rng, [30, 40, 60] as const);
          const x = d / v1 + d / v2;
          return story(copy, rng, "round-trip", "evaluate", {
            v1,
            v2,
            d,
            x: Number.isInteger(x) ? x : Math.round(x * 100) / 100,
          });
        },
        () => {
          const a = randInt(rng, 1, 4);
          const b = randInt(rng, a + 1, 6);
          const x = b * randInt(rng, 4, 12);
          return story(copy, rng, "fraction-word", "solve", {
            a,
            b,
            part: (a * x) / b,
            x,
            variable,
          });
        },
        () => {
          const m = randInt(rng, 4, 12);
          return story(copy, rng, "three-consecutive", "evaluate", {
            m,
            p: (m - 1) * m * (m + 1),
            x: m - 1,
            y: m + 1,
          });
        },
        () => {
          const a = randInt(rng, 1, 4);
          const u = randInt(rng, 1, 5);
          const tens = u + a;
          if (tens > 9) {
            return story(copy, rng, "reverse-digits", "solve", {
              n: 18,
              a: 2,
              x: 64,
            });
          }
          const n = 9 * a;
          const x = 10 * tens + u;
          return story(copy, rng, "reverse-digits", "solve", {
            n,
            a,
            x,
          });
        },
        () => {
          const a = randInt(rng, 2, 5);
          const b = 2 * a;
          return story(copy, rng, "pipes-fill-empty", "evaluate", {
            a,
            b,
            x: 2 * a,
          });
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
