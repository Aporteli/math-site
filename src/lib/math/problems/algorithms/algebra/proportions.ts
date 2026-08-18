import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  gcd,
  selectVariable,
  signed,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function ratio(...parts: Array<number | string>): string {
  return parts
    .map((part) =>
      typeof part === "number" && part < 0 ? `(${part})` : String(part),
    )
    .join(" : ");
}

function frac(num: number | string, den: number | string): string {
  return `\\dfrac{${num}}{${den}}`;
}

function reduceParts(parts: readonly number[]): number[] {
  const g = parts.reduce((acc, part) => gcd(acc, Math.abs(part)), 0);
  return parts.map((part) => part / g);
}

export const proportionsRatiosProblem = defineAlgebraProblem(
  "proportions-ratios",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // გაამარტივე a : b
        () => {
          const g = randInt(rng, 2, 8);
          const a = randInt(rng, 2, 9) * g;
          const b = randInt(rng, 2, 9) * g;
          const [sa, sb] = reduceParts([a, b]);
          return {
            instructionId: "simplify" as const,
            promptTex: ratio(a, b),
            solutionTex: aligned([
              `${a} : ${b} = ${g}\\cdot${sa} : ${g}\\cdot${sb}`,
              `= ${ratio(sa, sb)}`,
            ]),
          };
        },

        // a : b = c : x
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 9);
          const k = randInt(rng, 2, 6);
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(a, b)} = ${ratio(a * k, variable)}`,
            solutionTex: aligned([
              `${a}${variable} = ${b}\\cdot${a * k}`,
              `${variable} = ${b * k}`,
            ]),
          };
        },

        // a/b = x/d
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 9);
          const k = randInt(rng, 2, 6);
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(a, b)} = ${frac(variable, b * k)}`,
            solutionTex: aligned([
              `${b}${variable} = ${a}\\cdot${b * k}`,
              `${variable} = ${a * k}`,
            ]),
          };
        },

        // გაყავი n შეფარდებით a : b
        () => {
          const a = randInt(rng, 1, 6);
          const b = randInt(rng, 1, 6);
          const k = randInt(rng, 2, 8);
          const total = k * (a + b);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${ratio(a, b)},\\quad S = ${total}`,
            solutionTex: aligned([
              `${a} + ${b} = ${a + b}`,
              `${frac(a, a + b)}\\cdot${total} = ${k * a},\\quad ${frac(b, a + b)}\\cdot${total} = ${k * b}`,
            ]),
          };
        },

        // a / x = b / c
        () => {
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 9);
          const k = randInt(rng, 2, 5);
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(b * k, variable)} = ${frac(b, c)}`,
            solutionTex: aligned([
              `${b}${variable} = ${b * k}\\cdot${c}`,
              `${variable} = ${c * k}`,
            ]),
          };
        },

        // x : a = b : c
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          const k = randInt(rng, 2, 5);
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(variable, a)} = ${ratio(b, a * k)}`,
            solutionTex: aligned([
              `${a * k}${variable} = ${a}\\cdot${b}`,
              `${variable} = ${b * k}`,
            ]),
          };
        },

        // ორი რიცხვი შეფარდებით a : b, ჯამი n
        () => {
          const a = randInt(rng, 1, 6);
          const b = randInt(rng, 1, 6);
          const k = randInt(rng, 3, 9);
          const total = k * (a + b);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${variable}_1 : ${variable}_2 = ${ratio(a, b)},\\quad ${variable}_1 + ${variable}_2 = ${total}`,
            solutionTex: aligned([
              `${variable}_1 = ${k * a},\\quad ${variable}_2 = ${k * b}`,
            ]),
          };
        },

        // a : b : c გაამარტივე
        () => {
          const g = randInt(rng, 2, 6);
          const a = randInt(rng, 1, 6) * g;
          const b = randInt(rng, 1, 6) * g;
          const c = randInt(rng, 1, 6) * g;
          const simplified = reduceParts([a, b, c]);
          return {
            instructionId: "simplify" as const,
            promptTex: ratio(a, b, c),
            solutionTex: aligned([`${ratio(a, b, c)} = ${ratio(...simplified)}`]),
          };
        },

        // a/b = x/k
        () => {
          const a = randInt(rng, 2, 7);
          const b = randInt(rng, 2, 8);
          const m = randInt(rng, 2, 5);
          const k = b * m;
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(a, b)} = ${frac(variable, k)}`,
            solutionTex: aligned([
              `${variable} = ${frac(a * k, b)}`,
              `${variable} = ${a * m}`,
            ]),
          };
        },

        // n : n/2
        () => {
          const n = randInt(rng, 4, 16) * 2;
          const [sa, sb] = reduceParts([n, n / 2]);
          return {
            instructionId: "simplify" as const,
            promptTex: ratio(n, n / 2),
            solutionTex: aligned([`= ${ratio(sa, sb)}`]),
          };
        },

        // a : x = c : d
        () => {
          const a = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const k = randInt(rng, 2, 5);
          const d = a * k;
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(a, variable)} = ${ratio(c, d)}`,
            solutionTex: aligned([
              `${a}${variable} = ${c}\\cdot${d}`,
              `${variable} = ${c * k}`,
            ]),
          };
        },

        // ერთი წევრი: ka : kb, იპოვე k·b როცა ka მოცემულია
        () => {
          const a = randInt(rng, 2, 7);
          const b = randInt(rng, 2, 8);
          const k = randInt(rng, 3, 7);
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(a, b)} = ${ratio(k * a, variable)}`,
            solutionTex: aligned([`${variable} = ${k * b}`]),
          };
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // სამი ნაწილი a:b:c, ჯამი n
        () => {
          const a = randInt(rng, 1, 5);
          const b = randInt(rng, 1, 5);
          const c = randInt(rng, 1, 5);
          const k = randInt(rng, 2, 7);
          const total = k * (a + b + c);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${ratio(a, b, c)},\\quad S = ${total}`,
            solutionTex: aligned([
              `${a}+${b}+${c}=${a + b + c}`,
              `${k * a},\\; ${k * b},\\; ${k * c}`,
            ]),
          };
        },

        // (x + a)/b = c/d
        () => {
          const unknown = nonzero(rng, 2, 9);
          const a = randInt(rng, 1, 8);
          const b = randInt(rng, 2, 6);
          const k = randInt(rng, 1, 4);
          const c = k * (unknown + a);
          const d = k * b;
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(`${variable} + ${a}`, b)} = ${frac(c, d)}`,
            solutionTex: aligned([
              `${d}(${variable} + ${a}) = ${b}\\cdot${c}`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // a / (x + b) = c / d
        () => {
          const b = randInt(rng, 1, 6);
          const unknown = randInt(rng, 2, 8);
          const a = randInt(rng, 2, 8);
          const k = randInt(rng, 1, 4);
          const c = k * a;
          const d = k * (unknown + b);
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(a, `${variable} + ${b}`)} = ${frac(c, d)}`,
            solutionTex: aligned([
              `${a}\\cdot${d} = ${c}(${variable} + ${b})`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // შებრუნებული პროპორცია a y = b x
        () => {
          const b = randInt(rng, 2, 6);
          const k = randInt(rng, 2, 5);
          const a = b * k;
          const y = randInt(rng, 2, 8);
          const unknown = k * y;
          return {
            instructionId: "solve" as const,
            promptTex: `${a}\\cdot${y} = ${b}\\cdot${variable}`,
            solutionTex: aligned([
              `${variable} = ${frac(a * y, b)}`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // a:b და b:c → a:b:c
        () => {
          const a1 = randInt(rng, 2, 6);
          const b1 = randInt(rng, 2, 6);
          const b2 = randInt(rng, 2, 6);
          const c2 = randInt(rng, 2, 6);
          const g = gcd(b1, b2);
          const a = (a1 * b2) / g;
          const b = (b1 * b2) / g;
          const c = (c2 * b1) / g;
          const simplified = reduceParts([a, b, c]);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${ratio(a1, b1)},\\quad ${ratio(b2, c2)}`,
            solutionTex: aligned([
              `${ratio(a, b, c)} = ${ratio(...simplified)}`,
            ]),
          };
        },

        // a:b = c:d ⇒ (a+c):(b+d)
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 7);
          const k = randInt(rng, 2, 5);
          const c = a * k;
          const d = b * k;
          const [s1, s2] = reduceParts([a + c, b + d]);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${ratio(a, b)} = ${ratio(c, d)},\\quad (${a}+${c}):(${b}+${d})`,
            solutionTex: aligned([
              `${ratio(a + c, b + d)} = ${ratio(s1, s2)}`,
            ]),
          };
        },

        // გეომეტრიული შუა: a : x = x : b
        () => {
          const n = randInt(rng, 2, 6);
          const m = randInt(rng, 2, 6);
          const a = n * n;
          const b = m * m;
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(a, variable)} = ${ratio(variable, b)}`,
            solutionTex: aligned([
              `${variable}^2 = ${a}\\cdot${b}`,
              `${variable} = ${n * m}`,
            ]),
          };
        },

        // (x + a) : (x + b) = c : d
        () => {
          const unknown = nonzero(rng, 2, 8);
          const a = randInt(rng, 1, 5);
          let b = randInt(rng, 1, 6);
          while (b === a) b = randInt(rng, 1, 6);
          const k = randInt(rng, 1, 4);
          const c = k * (unknown + a);
          const d = k * (unknown + b);
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(`${variable} + ${a}`, `${variable} + ${b}`)} = ${ratio(c, d)}`,
            solutionTex: aligned([
              `${d}(${variable} + ${a}) = ${c}(${variable} + ${b})`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // x / a = (x + b) / c
        () => {
          const unknown = randInt(rng, 2, 8);
          const a = randInt(rng, 2, 6);
          const t = randInt(rng, 1, 4);
          const b = unknown * t;
          const c = a * (1 + t);
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(variable, a)} = ${frac(`${variable} + ${b}`, c)}`,
            solutionTex: aligned([
              `${c}${variable} = ${a}(${variable} + ${b})`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // ნაზავი: a:b, დავამატოთ მნიშვნელი პირველს
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 6);
          const add = a * randInt(rng, 1, 3);
          const [s1, s2] = reduceParts([a + add, b]);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${ratio(a, b)},\\quad ${a} \\mapsto ${a + add}`,
            solutionTex: aligned([
              `${ratio(a + add, b)} = ${ratio(s1, s2)}`,
            ]),
          };
        },

        // მასშტაბი 1 : n
        () => {
          const n = pick(rng, [10, 20, 25, 50, 100] as const);
          const map = randInt(rng, 2, 12);
          return {
            instructionId: "evaluate" as const,
            promptTex: `1 : ${n},\\quad ${map} \\rightarrow ${variable}`,
            solutionTex: aligned([
              `${variable} = ${map}\\cdot${n} = ${map * n}`,
            ]),
          };
        },

        // a/b = (a+k)/(x)
        () => {
          const a = randInt(rng, 2, 7);
          const b = randInt(rng, 2, 8);
          const m = randInt(rng, 2, 5);
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(a, b)} = ${frac(a * m, variable)}`,
            solutionTex: aligned([
              `${a}${variable} = ${b}\\cdot${a * m}`,
              `${variable} = ${b * m}`,
            ]),
          };
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // (x + a)/(x - b) = c/d
        () => {
          const unknown = randInt(rng, 4, 10);
          const a = randInt(rng, 1, 5);
          let b = randInt(rng, 1, 3);
          while (b === unknown) b = randInt(rng, 1, 3);
          const k = randInt(rng, 1, 4);
          const c = k * (unknown + a);
          const d = k * (unknown - b);
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(`${variable} + ${a}`, `${variable} - ${b}`)} = ${frac(c, d)}`,
            solutionTex: aligned([
              `${d}(${variable} + ${a}) = ${c}(${variable} - ${b})`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // (2x - a):(x + b) = c:d
        () => {
          const unknown = randInt(rng, 3, 8);
          const a = randInt(rng, 1, 4);
          const b = randInt(rng, 1, 5);
          const k = randInt(rng, 1, 3);
          const c = k * (2 * unknown - a);
          const d = k * (unknown + b);
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(`2${variable} - ${a}`, `${variable} + ${b}`)} = ${ratio(c, d)}`,
            solutionTex: aligned([
              `${d}(2${variable} - ${a}) = ${c}(${variable} + ${b})`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // a:b და b:c → a:b:c
        () => {
          const a1 = randInt(rng, 2, 5);
          const b1 = randInt(rng, 2, 5);
          const b2 = randInt(rng, 2, 5);
          const c2 = randInt(rng, 2, 5);
          const g = gcd(b1, b2);
          const a = (a1 * b2) / g;
          const b = (b1 * b2) / g;
          const c = (c2 * b1) / g;
          const simplified = reduceParts([a, b, c]);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${ratio(a1, b1)},\\quad ${ratio(b2, c2)}`,
            solutionTex: aligned([
              `${ratio(a, b, c)} = ${ratio(...simplified)}`,
            ]),
          };
        },

        // გაყავი n შეფარდებით a:b:c:d
        () => {
          const parts = [
            randInt(rng, 1, 4),
            randInt(rng, 1, 4),
            randInt(rng, 1, 4),
            randInt(rng, 1, 4),
          ] as const;
          const k = randInt(rng, 2, 5);
          const sum = parts[0] + parts[1] + parts[2] + parts[3];
          return {
            instructionId: "evaluate" as const,
            promptTex: `${ratio(...parts)},\\quad S = ${k * sum}`,
            solutionTex: aligned([
              `${parts.join("+")}=${sum}`,
              `${parts.map((part) => k * part).join(",\\; ")}`,
            ]),
          };
        },

        // x : (x+a) = (x+b) : (x+c)
        () => {
          const unknown = randInt(rng, 3, 9);
          const t = randInt(rng, 1, 4);
          const a = t;
          const b = unknown;
          const c = unknown + 2 * t;
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(variable, `${variable} + ${a}`)} = ${ratio(`${variable} + ${b}`, `${variable} + ${c}`)}`,
            solutionTex: aligned([
              `${variable}(${variable} + ${c}) = (${variable} + ${a})(${variable} + ${b})`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // x/y = a/b, xy = k
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 5);
          const t = randInt(rng, 2, 4);
          const x = a * t;
          const y = b * t;
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(variable, "y")} = ${frac(a, b)},\\quad ${variable} y = ${x * y}`,
            solutionTex: aligned([
              `${variable} = ${frac(a, b)} y`,
              `${variable} = ${x},\\quad y = ${y}`,
            ]),
          };
        },

        // (ax + b) : (cx + d) = p : q
        () => {
          const unknown = randInt(rng, 2, 7);
          const a = randInt(rng, 2, 4);
          let b = nonzero(rng, -4, 4);
          while (a * unknown + b === 0) b = nonzero(rng, -4, 4);
          const c = randInt(rng, 1, 3);
          let d = nonzero(rng, -4, 4);
          while (c * unknown + d === 0) d = nonzero(rng, -4, 4);
          const p = a * unknown + b;
          const q = c * unknown + d;
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(`${a}${variable} ${signed(b)}`, `${c}${variable} ${signed(d)}`)} = ${ratio(p, q)}`,
            solutionTex: aligned([
              `${q}(${a}${variable} ${signed(b)}) = ${p}(${c}${variable} ${signed(d)})`,
              `${variable} = ${unknown}`,
            ]),
          };
        },

        // (a/b) : (c/d) = e : x
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 5);
          const k = randInt(rng, 2, 4);
          const e = a;
          const c = k;
          const d = 1;
          return {
            instructionId: "solve" as const,
            promptTex: `${frac(a, b)} : ${frac(c, d)} = ${e} : ${variable}`,
            solutionTex: aligned([
              `${frac(a, b)} : ${k} = ${a} : ${variable}`,
              `${variable} = ${b * k}`,
            ]),
          };
        },

        // a:b = c:d = e:x
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 6);
          const k = randInt(rng, 2, 4);
          const m = randInt(rng, 2, 4);
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(a, b)} = ${ratio(a * k, b * k)} = ${ratio(a * m, variable)}`,
            solutionTex: aligned([
              `${frac(a * m, variable)} = ${frac(a, b)}`,
              `${variable} = ${b * m}`,
            ]),
          };
        },

        // გეომეტრიული პროგრესია a, x, ar^2
        () => {
          const r = randInt(rng, 2, 4);
          const a = randInt(rng, 1, 3);
          const x = a * r;
          const third = x * r;
          return {
            instructionId: "solve" as const,
            promptTex: `${a},\\; ${variable},\\; ${third}`,
            solutionTex: aligned([
              `${variable}^2 = ${a}\\cdot${third}`,
              `${variable} = ${x}`,
            ]),
          };
        },

        // continued proportion a:b = b:c = c:x
        () => {
          const r = randInt(rng, 2, 3);
          const a = randInt(rng, 1, 3);
          const b = a * r;
          const c = b * r;
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(a, b)} = ${ratio(b, c)} = ${ratio(c, variable)}`,
            solutionTex: aligned([
              `${c}${variable} = ${c}\\cdot${c}`,
              `${variable} = ${c * r}`,
            ]),
          };
        },

        // (x/a + 1) : (x/b - 1) = p : q
        () => {
          const unknown = pick(rng, [6, 12] as const);
          const a = 2;
          const b = 3;
          const left = unknown / a + 1;
          const right = unknown / b - 1;
          return {
            instructionId: "solve" as const,
            promptTex: `${ratio(`${frac(variable, a)} + 1`, `${frac(variable, b)} - 1`)} = ${ratio(left, right)}`,
            solutionTex: aligned([
              `${right}\\bigl(${frac(variable, a)} + 1\\bigr) = ${left}\\bigl(${frac(variable, b)} - 1\\bigr)`,
              `${variable} = ${unknown}`,
            ]),
          };
        },
      ],
    };

    const generateSelectedTemplate = pick(
      rng,
      templatesByDifficulty[difficulty],
    );
    return generateSelectedTemplate() as GeneratedProblem;
  },
);
