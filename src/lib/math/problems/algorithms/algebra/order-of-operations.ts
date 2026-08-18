import type { GeneratedProblem } from "../types";
import { aligned, defineAlgebraProblem } from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function num(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

function pow(base: string | number, exp: number): string {
  if (typeof base === "number" && base < 0) return `(${base})^{${exp}}`;
  return `${base}^{${exp}}`;
}

function dot(a: string | number, b: string | number): string {
  return `${typeof a === "number" ? num(a) : a} \\cdot ${typeof b === "number" ? num(b) : b}`;
}

function div(a: string | number, b: string | number): string {
  return `${typeof a === "number" ? num(a) : a} \\div ${typeof b === "number" ? num(b) : b}`;
}

function ev(
  promptTex: string,
  steps: string[],
  value: number,
): GeneratedProblem {
  return {
    instructionId: "evaluate",
    promptTex,
    solutionTex: aligned([...steps, `= ${value}`]),
  } as GeneratedProblem;
}

export const orderOfOperationsProblem = defineAlgebraProblem(
  "order-of-operations",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // a + b * c
        () => {
          const b = randInt(rng, 2, 9);
          const c = randInt(rng, 2, 9);
          const a = randInt(rng, 2, 12);
          const prod = b * c;
          return ev(`${a} + ${dot(b, c)}`, [`${a} + ${prod}`], a + prod);
        },

        // a * b + c
        () => {
          const a = randInt(rng, 2, 9);
          const b = randInt(rng, 2, 9);
          const c = randInt(rng, 1, 12);
          const prod = a * b;
          return ev(`${dot(a, b)} + ${c}`, [`${prod} + ${c}`], prod + c);
        },

        // a - b * c
        () => {
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const prod = b * c;
          const a = prod + randInt(rng, 1, 12);
          return ev(`${a} - ${dot(b, c)}`, [`${a} - ${prod}`], a - prod);
        },

        // (a + b) * c
        () => {
          const a = randInt(rng, 2, 9);
          const b = randInt(rng, 1, 9);
          const c = randInt(rng, 2, 8);
          const sum = a + b;
          return ev(
            `${dot(`(${a} + ${b})`, c)}`,
            [`${dot(sum, c)}`],
            sum * c,
          );
        },

        // a + b^2
        () => {
          const b = randInt(rng, 2, 9);
          const a = randInt(rng, 1, 12);
          return ev(`${a} + ${pow(b, 2)}`, [`${a} + ${b * b}`], a + b * b);
        },

        // a * b^2
        () => {
          const b = randInt(rng, 2, 6);
          const a = randInt(rng, 2, 8);
          return ev(`${dot(a, pow(b, 2))}`, [`${dot(a, b * b)}`], a * b * b);
        },

        // a + b ÷ c
        () => {
          const c = randInt(rng, 2, 9);
          const k = randInt(rng, 2, 8);
          const b = c * k;
          const a = randInt(rng, 1, 12);
          return ev(`${a} + ${div(b, c)}`, [`${a} + ${k}`], a + k);
        },

        // (a + b) ÷ c
        () => {
          const c = randInt(rng, 2, 8);
          const k = randInt(rng, 2, 9);
          const a = randInt(rng, 1, k * c - 1);
          const b = k * c - a;
          return ev(`${div(`(${a} + ${b})`, c)}`, [`${div(k * c, c)}`], k);
        },

        // a - b + c  (left to right)
        () => {
          const a = randInt(rng, 8, 20);
          const b = randInt(rng, 2, 9);
          const c = randInt(rng, 1, 9);
          return ev(`${a} - ${b} + ${c}`, [`${a - b} + ${c}`], a - b + c);
        },

        // a * (b + c)
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 1, 9);
          const c = randInt(rng, 1, 9);
          const sum = b + c;
          return ev(`${dot(a, `(${b} + ${c})`)}`, [`${dot(a, sum)}`], a * sum);
        },

        // a^2 + b
        () => {
          const a = randInt(rng, 2, 9);
          const b = randInt(rng, 1, 12);
          return ev(`${pow(a, 2)} + ${b}`, [`${a * a} + ${b}`], a * a + b);
        },

        // a + b * c - d
        () => {
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const a = randInt(rng, 2, 10);
          const d = randInt(rng, 1, 9);
          const prod = b * c;
          return ev(
            `${a} + ${dot(b, c)} - ${d}`,
            [`${a} + ${prod} - ${d}`, `${a + prod} - ${d}`],
            a + prod - d,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // a + b * (c - d)
        () => {
          const d = randInt(rng, 1, 6);
          const c = d + randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          const a = randInt(rng, 1, 12);
          const inner = c - d;
          const prod = b * inner;
          return ev(
            `${a} + ${dot(b, `(${c} - ${d})`)}`,
            [`${a} + ${dot(b, inner)}`, `${a} + ${prod}`],
            a + prod,
          );
        },

        // (a + b) * (c - d)
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 1, 8);
          const d = randInt(rng, 1, 5);
          const c = d + randInt(rng, 2, 7);
          const left = a + b;
          const right = c - d;
          return ev(
            `${dot(`(${a} + ${b})`, `(${c} - ${d})`)}`,
            [`${dot(left, right)}`],
            left * right,
          );
        },

        // a * b + c * d
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 8);
          const p = a * b;
          const q = c * d;
          return ev(
            `${dot(a, b)} + ${dot(c, d)}`,
            [`${p} + ${q}`],
            p + q,
          );
        },

        // a^2 + b * c
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const prod = b * c;
          return ev(
            `${pow(a, 2)} + ${dot(b, c)}`,
            [`${a * a} + ${prod}`],
            a * a + prod,
          );
        },

        // (a + b)^2
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 1, 7);
          const s = a + b;
          return ev(`(${a} + ${b})^{2}`, [`${pow(s, 2)}`], s * s);
        },

        // a + b^2 * c
        () => {
          const b = randInt(rng, 2, 6);
          const c = randInt(rng, 2, 7);
          const a = randInt(rng, 1, 12);
          const sq = b * b;
          const prod = sq * c;
          return ev(
            `${a} + ${dot(pow(b, 2), c)}`,
            [`${a} + ${dot(sq, c)}`, `${a} + ${prod}`],
            a + prod,
          );
        },

        // a ÷ b * c  (left to right)
        () => {
          const b = randInt(rng, 2, 8);
          const k = randInt(rng, 2, 9);
          const a = b * k;
          const c = randInt(rng, 2, 8);
          return ev(`${div(a, b)} \\cdot ${c}`, [`${dot(k, c)}`], k * c);
        },

        // a - (b - c)
        () => {
          const c = randInt(rng, 1, 8);
          const b = c + randInt(rng, 1, 9);
          const a = randInt(rng, 5, 18);
          const inner = b - c;
          return ev(`${a} - (${b} - ${c})`, [`${a} - ${inner}`], a - inner);
        },

        // a * (b + c * d)
        () => {
          const c = randInt(rng, 2, 6);
          const d = randInt(rng, 2, 6);
          const b = randInt(rng, 1, 8);
          const a = randInt(rng, 2, 7);
          const prod = c * d;
          const inner = b + prod;
          return ev(
            `${dot(a, `(${b} + ${dot(c, d)})`)}`,
            [`${dot(a, `(${b} + ${prod})`)}`, `${dot(a, inner)}`],
            a * inner,
          );
        },

        // a * b^2 - c
        () => {
          const b = randInt(rng, 2, 6);
          const a = randInt(rng, 2, 7);
          const prod = a * b * b;
          const c = randInt(rng, 1, Math.min(12, prod - 1));
          return ev(
            `${dot(a, pow(b, 2))} - ${c}`,
            [`${dot(a, b * b)} - ${c}`, `${prod} - ${c}`],
            prod - c,
          );
        },

        // a + b * c - d  with larger range
        () => {
          const b = randInt(rng, 3, 9);
          const c = randInt(rng, 3, 9);
          const a = randInt(rng, 4, 15);
          const d = randInt(rng, 2, 12);
          const prod = b * c;
          return ev(
            `${a} + ${dot(b, c)} - ${d}`,
            [`${a} + ${prod} - ${d}`, `${a + prod} - ${d}`],
            a + prod - d,
          );
        },

        // a ÷ (b + c)
        () => {
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 1, 8);
          const den = b + c;
          const k = randInt(rng, 2, 9);
          const a = den * k;
          return ev(`${div(a, `(${b} + ${c})`)}`, [`${div(a, den)}`], k);
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // a + b * c^2 - d
        () => {
          const c = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 6);
          const a = randInt(rng, 2, 12);
          const d = randInt(rng, 1, 15);
          const sq = c * c;
          const prod = b * sq;
          return ev(
            `${a} + ${dot(b, pow(c, 2))} - ${d}`,
            [`${a} + ${dot(b, sq)} - ${d}`, `${a} + ${prod} - ${d}`, `${a + prod} - ${d}`],
            a + prod - d,
          );
        },

        // (a - b)^2 + c * d
        () => {
          const b = randInt(rng, 1, 6);
          const a = b + randInt(rng, 2, 7);
          const c = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 8);
          const diff = a - b;
          const prod = c * d;
          return ev(
            `(${a} - ${b})^{2} + ${dot(c, d)}`,
            [`${pow(diff, 2)} + ${prod}`, `${diff * diff} + ${prod}`],
            diff * diff + prod,
          );
        },

        // a * (b + c * d) - e
        () => {
          const c = randInt(rng, 2, 6);
          const d = randInt(rng, 2, 6);
          const b = randInt(rng, 1, 8);
          const a = randInt(rng, 2, 6);
          const e = randInt(rng, 1, 12);
          const prod = c * d;
          const inner = b + prod;
          const outer = a * inner;
          return ev(
            `${dot(a, `(${b} + ${dot(c, d)})`)} - ${e}`,
            [
              `${dot(a, `(${b} + ${prod})`)} - ${e}`,
              `${dot(a, inner)} - ${e}`,
              `${outer} - ${e}`,
            ],
            outer - e,
          );
        },

        // -a^2 + b * c   (exponent before unary minus)
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const sq = a * a;
          const prod = b * c;
          return ev(
            `-${pow(a, 2)} + ${dot(b, c)}`,
            [`-${sq} + ${prod}`],
            -sq + prod,
          );
        },

        // ((a + b) * c - d) ÷ e
        () => {
          const c = randInt(rng, 2, 5);
          const sum = randInt(rng, 3, 10);
          const a = randInt(rng, 1, sum - 1);
          const b = sum - a;
          const d = randInt(rng, 1, Math.min(8, sum * c - 4));
          const inner = sum * c - d;
          const divisors: number[] = [];
          for (let e = 2; e <= 9; e += 1) {
            if (inner % e === 0) divisors.push(e);
          }
          const e = pick(rng, divisors.length > 0 ? divisors : [inner]);
          return ev(
            `${div(`((${a} + ${b}) \\cdot ${c} - ${d})`, e)}`,
            [
              `${div(`(${sum} \\cdot ${c} - ${d})`, e)}`,
              `${div(inner, e)}`,
            ],
            inner / e,
          );
        },

        // a - b * (c + d)^2 ÷ e
        () => {
          const e = pick(rng, [2, 4, 5] as const);
          const s = pick(rng, [2, 3, 4] as const);
          const sq = s * s;
          const b = e;
          const prod = (b * sq) / e;
          const a = prod + randInt(rng, 2, 12);
          const c = randInt(rng, 1, s - 1);
          const d = s - c;
          return ev(
            `${a} - ${dot(b, pow(`(${c} + ${d})`, 2))} \\div ${e}`,
            [
              `${a} - ${dot(b, pow(s, 2))} \\div ${e}`,
              `${a} - ${dot(b, sq)} \\div ${e}`,
              `${a} - ${prod}`,
            ],
            a - prod,
          );
        },

        // a * b - c * (d + e)
        () => {
          const a = randInt(rng, 3, 8);
          const b = randInt(rng, 3, 8);
          const c = randInt(rng, 2, 6);
          const d = randInt(rng, 1, 6);
          const e = randInt(rng, 1, 6);
          const left = a * b;
          const right = c * (d + e);
          return ev(
            `${dot(a, b)} - ${dot(c, `(${d} + ${e})`)}`,
            [`${left} - ${dot(c, d + e)}`, `${left} - ${right}`],
            left - right,
          );
        },

        // (a + b ÷ c) * d - e
        () => {
          const c = randInt(rng, 2, 8);
          const q = randInt(rng, 2, 7);
          const b = c * q;
          const a = randInt(rng, 1, 10);
          const d = randInt(rng, 2, 6);
          const e = randInt(rng, 1, 12);
          const inner = a + q;
          return ev(
            `${dot(`(${a} + ${div(b, c)})`, d)} - ${e}`,
            [
              `${dot(`(${a} + ${q})`, d)} - ${e}`,
              `${dot(inner, d)} - ${e}`,
              `${inner * d} - ${e}`,
            ],
            inner * d - e,
          );
        },

        // a^3 - b * c + d
        () => {
          const a = pick(rng, [2, 3, 4] as const);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const d = randInt(rng, 1, 12);
          const cube = a * a * a;
          const prod = b * c;
          return ev(
            `${pow(a, 3)} - ${dot(b, c)} + ${d}`,
            [`${cube} - ${prod} + ${d}`, `${cube - prod} + ${d}`],
            cube - prod + d,
          );
        },

        // a + (b - c * d)^2
        () => {
          const c = randInt(rng, 2, 5);
          const d = randInt(rng, 2, 5);
          const prod = c * d;
          const b = prod + nonzero(rng, -4, 4);
          const a = randInt(rng, 1, 10);
          const inner = b - prod;
          return ev(
            `${a} + (${b} - ${dot(c, d)})^{2}`,
            [`${a} + (${b} - ${prod})^{2}`, `${a} + ${pow(inner, 2)}`],
            a + inner * inner,
          );
        },

        // (a - b * c)^2
        () => {
          const b = randInt(rng, 2, 6);
          const c = randInt(rng, 2, 6);
          const prod = b * c;
          const a = prod + nonzero(rng, -5, 5);
          const inner = a - prod;
          return ev(
            `(${a} - ${dot(b, c)})^{2}`,
            [`(${a} - ${prod})^{2}`, pow(inner, 2)],
            inner * inner,
          );
        },

        // a ÷ b + c * d^2
        () => {
          const b = randInt(rng, 2, 8);
          const q = randInt(rng, 2, 8);
          const a = b * q;
          const d = randInt(rng, 2, 5);
          const c = randInt(rng, 2, 6);
          const sq = d * d;
          const prod = c * sq;
          return ev(
            `${div(a, b)} + ${dot(c, pow(d, 2))}`,
            [`${q} + ${dot(c, sq)}`, `${q} + ${prod}`],
            q + prod,
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
