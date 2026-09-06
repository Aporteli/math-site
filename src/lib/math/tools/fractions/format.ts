import type { Fraction, FractionForms, MixedNumber } from "./types";
import { abs, toMixed } from "./rational";

export function toLatex(a: Fraction): string {
  if (a.d === 1n) return a.n.toString();
  const sign = a.n < 0n ? "-" : "";
  return `${sign}\\frac{${abs(a.n)}}{${a.d}}`;
}

export function toMixedLatex(m: MixedNumber): string {
  const sign = m.sign === -1 ? "-" : "";
  if (m.n === 0n) return `${sign}${m.whole}`;
  if (m.whole === 0n) {
    return `${sign}\\frac{${m.n}}{${m.d}}`;
  }
  return `${sign}${m.whole}\\,\\frac{${m.n}}{${m.d}}`;
}

export function toPlain(a: Fraction): string {
  return a.d === 1n ? a.n.toString() : `${a.n}/${a.d}`;
}

/**
 * Exact decimal: 1/2 → "0.5", 1/3 → "0.\overline{3}".
 */
export function toRepeatingDecimal(a: Fraction): {
  text: string;
  parts: { nonRepeating: string; repeating: string } | null;
} {
  if (a.d === 1n) return { text: a.n.toString(), parts: null };

  const sign = a.n < 0n ? "-" : "";
  const num = abs(a.n);
  const whole = num / a.d;
  let rem = num % a.d;
  if (rem === 0n) {
    return { text: `${sign}${whole}`, parts: null };
  }

  const seen = new Map<bigint, number>();
  const digits: string[] = [];
  let repeatAt = -1;

  while (rem !== 0n && digits.length < 64) {
    const prev = seen.get(rem);
    if (prev !== undefined) {
      repeatAt = prev;
      break;
    }
    seen.set(rem, digits.length);
    rem *= 10n;
    digits.push((rem / a.d).toString());
    rem = rem % a.d;
  }

  const head = `${sign}${whole}.`;
  if (repeatAt < 0) {
    return { text: head + digits.join(""), parts: null };
  }

  const non = digits.slice(0, repeatAt).join("");
  const rep = digits.slice(repeatAt).join("");
  return {
    text: `${head}${non}\\overline{${rep}}`,
    parts: { nonRepeating: non, repeating: rep },
  };
}

export function toPercent(a: Fraction, places = 4): string {
  const hundred = { n: a.n * 100n, d: a.d };
  const dec = toRepeatingDecimal(hundred);
  if (dec.parts) return `${dec.text}\\%`;
  const [w, f = ""] = dec.text.replace("-", "").split(".");
  const trimmed = f.slice(0, places).replace(/0+$/, "");
  const body = trimmed ? `${w}.${trimmed}` : w;
  return `${a.n < 0n ? "-" : ""}${body}\\%`;
}

export function forms(unsimplified: Fraction, simplified: Fraction): FractionForms {
  const mixed = toMixed(simplified);
  const dec = toRepeatingDecimal(simplified);
  return {
    simplified,
    unsimplified,
    mixed,
    decimal: dec.text.replace("\\overline{", "").replace("}", ""),
    repeating: dec.parts,
    percent: toPercent(simplified),
    latex: toLatex(simplified),
    mixedLatex: toMixedLatex(mixed),
    plain: toPlain(simplified),
  };
}

export const OP_TEX = {
  "+": "+",
  "-": "-",
  "*": "\\times",
  "/": "\\div",
} as const;